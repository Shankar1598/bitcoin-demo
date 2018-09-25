const express = require("express")
const Blockchain  = require("./blockchain")
const bodyParser = require("body-parser")
const uuid = require('uuid/v1')
const rp = require('request-promise')

app = express();
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended:false}))

port = process.argv[2]
// url = process.argv[3]

bitcoin = new Blockchain();
 
app.get("/", (req,res)=>{
    res.send(`
        <h3>Available routs:</h3> <br>
            /blockchain <br>
            /transaction <br>
            /mine <br>
            /register-and-broadcast
    `)
})

app.get("/blockchain",(req,res)=>{
    res.send(bitcoin)
})

app.post('/transaction',(req,res)=>{
    blockIndex = bitcoin.addTransaction(req.body.newTransaction)
    res.send(`Transaction added to the queue`)
})

app.post('/transaction/broadcast',(req,res)=>{
    newTransaction = bitcoin.createNewTransaction(
        req.body.amount,
        req.body.sender,
        req.body.receiver
    )
    bitcoin.addTransaction(newTransaction)
    const promiseList=[]
    bitcoin.networkNodes.forEach(node=>{
        promiseList.push(
            rp({
                url:`${node}/transaction`,
                method:'POST',
                body:{newTransaction},
                json:true
            })
        )
    })

    Promise.all(promiseList)
        .then(data=>{
            res.json({
                from:`${bitcoin.currentNodeUrl}`,
                msg:'Transaction added to queue'
            })
        })
})

app.get('/mine',(req,res)=>{
    // if(!bitcoin.pendingTransactions.length){
    //     res.send("No new transactions created")
    //     return
    // }
    prevHash = bitcoin.getLastBlock()['hash']

    const data = {
        transactions: bitcoin.pendingTransactions
        // index: bitcoin.getLastBlock()['index']+1
        // I think it is unnecessary to add this attribute to transaction structure coz the blockchain structure already contains this index value
    }

    const nonce = bitcoin.proofOfWork(prevHash,data)
    const hash = bitcoin.hashBlock(prevHash,data,nonce)

    const newBlock = bitcoin.createNewBlock(nonce,prevHash,hash)

    const promiseList=[]
    bitcoin.networkNodes.forEach(node=>{
        promiseList.push(
            rp({
                url:`${node}/recieve-block`,
                method:'POST',
                body: {newBlock},
                json:true
            })
        )
    })

    Promise.all(promiseList)
        .then(data=>{
            const reqOptions = {
                url:`${bitcoin.currentNodeUrl}/transaction/broadcast`,
                method:'POST',
                body: bitcoin.createNewTransaction(12.5,"bitcoin.org",bitcoin.nodeAddress),
                json:true
            }
            return rp(reqOptions)
        })
        .then(data=>{
            res.json({
                from:`${bitcoin.currentNodeUrl}`,
                msg:"Block Mined Successfully",
                newBlock
            })
        })

    res.json({
        message:"Block mined successfully",
        newBlock
    })
})

app.post('/recieve-block',(req,res)=>{
    const newBlock = req.body.newBlock
    const lastBlock = bitcoin.getLastBlock()

    if(newBlock.prevHash===lastBlock.hash && newBlock.index===lastBlock.index+1 && newBlock.hash.substring(0,4)==='0000'){
        bitcoin.chain.push(newBlock)
        bitcoin.pendingTransactions=[];
        res.json({
            msg:"Block added successfully"
        })
    }
    res.json({
        msg:"Block not valid"
    })
})

app.post('/register-and-broadcast',(req,res)=>{
    const newNode = req.body.newNode

    //TODO: Change this section to get the nodeList of the registering node too and update and sync it with the network
    //const newNetworkNodes = req.body.networkNodes
    
    const promiseList = [] //Send the new node to all the nodes in the network
    bitcoin.networkNodes.forEach(node=>{
        promiseList.push(
            rp({
                url: `${node}/register-node`,
                method: 'POST',
                body: {newNode},
                json:true
            })
        )
    })

    //Add new node to the current network
    bitcoin.networkNodes.push(newNode)

    //Send the list of all the nodes in the network to the new node
    Promise.all(promiseList)
        .then(data=>{
            //returns a Promise
            return rp({
                url: `${newNode}/register-nodes-bulk`,
                method: 'POST',
                body: {
                    nodeList: [...bitcoin.networkNodes,bitcoin.currentNodeUrl]
                },
                json:true
            })
        }) //Final response after completion
        .then(
            (data)=>{
                res.json({
                    msg:"Node registered successfully"
                })
            }
        )
})

//Receive a node and add it to the networkNode list
app.post('/register-node',(req,res)=>{
    const newNode = req.body.newNode;
    if(!bitcoin.networkNodes.includes(newNode) && bitcoin.currentNodeUrl!==newNode){
        bitcoin.networkNodes.push(newNode)
    } else {
        res.json({
            from:`${bitcoin.currentNodeUrl}/register-node`,
            msg:"Already Exist"
        })
    }
    res.json({
        msg:"Node registered"
    })
})

//Receive a list of nodes and add it to the networkNodes list
app.post('/register-nodes-bulk',(req,res)=>{
    req.body.nodeList.forEach((node)=>{
        if(!bitcoin.networkNodes.includes(node) && bitcoin.currentNodeUrl!=node){
            bitcoin.networkNodes.push(node)
        }
    })
    res.json({
        msg:"Node list updated"
    })
})

//Verify the blockchain
app.get("/consensus",(req,res)=>{
    promiseList=[]
    console.log("Starting Consensus")
    //Get blockchain for all the nodes int the network
    bitcoin.networkNodes.forEach(node=>{
        promiseList.push(
            rp({
                uri:`${node}/blockchain`,
                method: 'GET',
                json:true
            })
        )
    })

    //Compare all the blockchains and update the current node
    Promise.all(promiseList)
        .then(blockchains=>{
            const currentChainLength = bitcoin.chain.length
            let newPendingTransaction = null
            let longestChain = bitcoin.chain
            console.log("Current chain length "+currentChainLength)

            blockchains.forEach(blockchain=>{
                
                if(blockchain.chain.length > longestChain.length){
                    const isValid = bitcoin.isValidChain(blockchain.chain)
                    
                    if(isValid){
                        longestChain = blockchain.chain
                        newPendingTransaction = bitcoin.pendingTransactions
                    }
                }
            })

            //If a longer chain is not available
            if(currentChainLength === longestChain.length){
                res.json({
                    msg:"Chain was not replaced"
                })
            } else {
                //If a longer chain is available
                bitcoin.chain = longestChain
                bitcoin.pendingTransactions = newPendingTransaction
                
                res.json({
                    msg:"The chain has been replaced"
                })
            }

        })
})

app.get("/explore-block/:hash",(req,res)=>{
    res.json(bitcoin.getBlock(req.prams.hash))
})

app.get("/explore-transaction/:id",(req,res)=>{
    res.json(bitcoin.getTransaction(req.prams.id))
})

app.get("/explore-address/:address",(req,res)=>{
    res.json(bitcoin.getAddress(req.prams.address))
})

app.listen(port,()=>{
    console.log(`Listening at ${port}...`)
})