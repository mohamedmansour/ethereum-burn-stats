# Ethereum Burn Website

To run using Docker:

```
docker run -p 8545:8545 -p 8546:8546 -p 30303:30303 --name=geth -dti -v /data/geth:/data ethereum-node --datadir=/data/geth --http --http.addr="0.0.0.0" --ws --ws.addr="0.0.0.0" --calaveras --http.api "personal,eth,net,web3,debug" --ws.api "personal,eth,net,web3,debug"
```

Run the web app:

```
npm start
```

