# bitcoin-demo
A bitcoin like prototype system built from scratch with Node JS

Run the command
```
npm install
```

Then run the following commands to start 6 different nodes

```
npm run node0
npm run node1
npm run node2
npm run node3
npm run node4
npm run node5
```

Download and install postman

Then try the endpoints

```
GET  /blockchain - To view the entire blockchain

GET  /mine - To mine a new block

GET  /consensus - To run Proof of Work (woth difficulty 5)

POST /register-and-broadcast - To register the nodes in the decentralized network 
Data: {"newNode":<NodeUrl>}

POST /transaction/broadcast - to create a new transaction
Data: {"sender":<sender>,"receiver":<receiver>,"amount":<amount>}
```

