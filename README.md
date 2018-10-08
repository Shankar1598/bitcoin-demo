# bitcoin-demo
A bitcoin like prototype system built from scratch with Node JS

Run NPN init first

The run the following commands to start 5 mining nodes

```
npm run node0
npm run node1
npm run node2
npm run node3
npm run node4
npm run node5
```

Then try the endpoints

```
GET  /blockchain - To view the entire blockchain

GET  /mine - To mine a new block

GET  /consensus - To run consensus

POST /register-and-broadcast - To register the nodes in the decentralized network 
Data: {"newNode":<NodeUrl>}

POST /transaction/broadcast - to create a new transaction
Data: {"sender":<sender>,"receiver":<receiver>,"amount":<amount>}
```

