const sha256 = require('sha256')
const uuid = require('uuid/v1')


class Blockchain{

    constructor(){
        this.chain = []
        this.pendingTransactions = []
        this.currentNodeUrl = process.argv[3]
        this.networkNodes = []
        this.nodeAddress = uuid().split('-').join('')

        this.createNewBlock(0,'0','0'); //genicis block
    }

    createNewBlock(nonce,prevHash,hash){
        const newBlock = {
            //Not considered for hashing
            index: this.chain.length+1,
            timestamp: Date.now(),

            // Considered for hashing
            transactions: this.pendingTransactions,
            nonce,
            prevHash,

            //The hash
            hash
        }
        this.pendingTransactions = []
        this.chain.push(newBlock)

        return newBlock
    }

    createNewTransaction(amount,sender,receiver){
        return {
            amount,
            sender,
            receiver,
            transactionId: uuid().split('-').join('')
        }
    }

    addTransaction(transaction){
        this.pendingTransactions.push(transaction)
        return this.getLastBlock()['index']+1;
    }

    proofOfWork(prevHash, data){
        let nonce=0
        let hash = this.hashBlock(prevHash, data, nonce)
        while(hash.substring(0,4)!=="0000"){
            hash = this.hashBlock(prevHash, data, ++nonce)
        }

        return nonce;
    }

    hashBlock(prevHash, data, nonce){
        return sha256(prevHash+nonce.toString()+JSON.stringify(data))
    }

    getLastBlock(){
        return this.chain[this.chain.length-1]
    }

    isValidChain(blockchain){
        let currentBlock = null
        let prevBlock = null
        let isValidChain = true
        let blockHash = null
        for(let i=1;i<blockchain.length;i++){
            currentBlock = blockchain[i]
            prevBlock = blockchain[i-1]
            blockHash = this.hashBlock(prevBlock.hash,{transactions:currentBlock.transactions},currentBlock.nonce)
            if(currentBlock.prevHash !== prevBlock.hash) {
                isValidChain = false

                console.log("chain Not valid cozz.. CurrentBlockPrevHash: "+currentBlock.prevHash+" PrevBlockHash: "+prevBlock.hash)
            }
            if(blockHash.substring(0,4) !== '0000') {
                isValidChain = false
                console.log("chain Not valid cozz.. Hash: "+blockHash+" doenst have 4 '0's")
            }
        }
        //Genisis Block Check
        const genisisBlock = blockchain[0]
        
        if(!(genisisBlock.nonce===0 && genisisBlock.prevHash==="0" && genisisBlock.hash==="0" && genisisBlock.transactions.length===0)) isValidChain = false

        return isValidChain
    }

    getBlock(hash){
        this.chain.forEach(block=>{
            if(block.hash === hash){
                return block
            }
            return null;
        })
    }

    getTransaction(transactionId){
        this.chain.forEach(block=>{
            block.transactions.forEach(transaction=>{
                if(transaction.transactionId==transactionId){
                    return {transaction,block}
                }
            })
        })
    }

    getAddress(address){
        let balance = 0
        const transactions = []
        this.chain.forEach(block=>{
            block.transactions.forEach(transaction=>{
                if(transaction.sender===address){
                    balance-=transaction.amount
                    transactions.push(transaction)
                } else if(transaction.receiver===address){
                    balance+=transaction.amount
                    transactions.push(transaction)
                }
            })
        })

        return{
            transactions,
            balance
        }
    }
}

module.exports = Blockchain;