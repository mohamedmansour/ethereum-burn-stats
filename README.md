# Watch the Burn 🔥
When EIP-1559 gets deployed, ETH will be burned in every block if transactions exist. This website will show you how much ETH got burned in total and per block.

If you have a local Ethereum (we use geth) instance, you can update `REACT_APP_WEB3_URL` in  `.env.production.local` to your local ETH instance and run this offline! The instructions below show how to deploy it to a remote website under nginx.

## Donate towards Server Costs 💰
The costs of running this experiment is pretty high since it requires a dev version of Geth to be up and running which requires lots of memory and cpu. The VM and SSD storage currently costs exactly $150/month USD. If you would like to help out with the costs, please reach out to me. 

If you would like to tip, my ethereum address is `mansour.eth`, or my [gitcoin grant](https://gitcoin.co/grants/1709/ethereum-2-educational-grant).

## Setup dev environment ⚙

Setting up the environment requires a geth instance cloned below and web app to run. 

### Setup custom geth
1. Clone geth and build docker image. Assumes `/data` on local system exists
   ```
   git clone https://github.com/mohamedmansour/go-ethereum.git
   git checkout burned-eth
   cd go-ethereum
   docker build -t ethereum-node .
   mkdir /data
   ```

1. To run Geth inside Docker, run one of the following:
   *  Goerli
      ```
       docker run -p 8566:8546 -p 8567:8545 -p 30503:30303 --name=geth-goerli -dti -v /data:/data ethereum-node --datadir=/data/goerli --goerli --port=3030 --http --http.addr="0.0.0.0" --http.port=8545 --http.api="net,web3,eth,debug" --http.corsdomain="localhost"  --ws --ws.addr="0.0.0.0" --ws.port=8546 --ws.api="net,web3,eth,debug" --ws.origins="*" --maxpeers=5
      ```
      
### Setup web dev environment

1. Create `env` file:
   ```
   cp .env .env.local
   ```

1. Add your geth ws url to `.env.local`:
   ```
   REACT_APP_WEB3_URL=localhost
   ```

1. Install packages
   ```
   npm install
   ```

1. Run the web app:
   ```
   npm start
   ```
1. Launch the web app (goerli):
   ```
   open http://goerli.go.localhost:3000:
   ```

### Some devops maintenance

**Send transactions to testnet** 

Install web3 CLI client `curl -LSs https://raw.githubusercontent.com/gochain/web3/master/install.sh | sh` use it to create a test account, and you can use it to send transactions.

**Access geth console**
If you ran the `goerli` docker geth, you can just do, not `rm` is there so it cleans the container up after closing!:
```
docker run --rm -ti -v /data:/data ethereum-node --datadir=/data/goerli attach  
```
