# Watch the Burn 🔥
When EIP-1559 gets deployed, ETH will be burned in every block if transactions exist. This website will show you how much ETH got burned in total and per block.

If you have a local Ethereum (we use geth but you can use any ETH client) instance, you can update `REACT_APP_WEB3_URL` in  `.env.production.local` to your local ETH instance and run this offline! The instructions below show how to deploy it to a remote website under nginx.

[![Frontend CI/CD](https://github.com/mohamedmansour/ethereum-burn-stats/actions/workflows/frontend-azure-static-web-apps.yml/badge.svg?branch=main)](https://github.com/mohamedmansour/ethereum-burn-stats/actions/workflows/frontend-azure-static-web-apps.yml) [![Daemon CI/CD](https://github.com/mohamedmansour/ethereum-burn-stats/actions/workflows/daemon-linode.yml/badge.svg?branch=main)](https://github.com/mohamedmansour/ethereum-burn-stats/actions/workflows/daemon-linode.yml)

## Donate towards Server Costs 💰
The costs of running this experiment is pretty high since it requires a dev version of Geth to be up and running which requires lots of memory and cpu. The VM and SSD storage currently costs exactly $200/month USD. If you would like to help out with the costs, please reach out to me. 

If you would like to tip, my [gitcoin grant](https://gitcoin.co/grants/1709/watchtheburncom).

## Setup dev environment ⚙

Setting up the environment requires a geth instance, daemon geth proxy, and react web app. Optionally, you can install the varnish cache in between.

### Setup geth
1. Clone geth and build docker image. Assumes `/data` on local system exists
   ```
   git clone https://github.com/ethereum/go-ethereum.git
   cd go-ethereum
   docker build -t ethereum-node .
   mkdir /data
   ```

1. To run Geth inside Docker, run one of the following:
   *  Mainnet
      ```
       docker run --net=host --name=geth -dti -v /data:/data ethereum-node --datadir=/data/mainnet --mainnet --port=3030 --http --http.port=8545 --http.api="net,web3,eth" --http.corsdomain="localhost"  --ws --ws.port=8546 --ws.api="net,web3,eth" --ws.origins="*" --maxpeers=100
      ```
### Setup the Geth Proxy Daemon

1. Easiest thing is use docker.
   ```
    docker build -t geth-proxy ./daemon
   ```
   
1. Run the docker instance against your geth.
   ```
   docker run -d --name=geth-proxy --restart=on-failure:3 --net=host -v /data/geth-proxy:/data geth-proxy --addr=:8080 --geth-endpoint-http=http://localhost:8545 --geth-endpoint-websocket=ws://localhost:8546 --db-path=/data/mainnet.db --development
   ```
   If you include `--initializedb` it will start initializing the database since EIP-London, will take time. If you take it out, then it basically just starts at the current head.
   
### Optional: Varnish cache to cache all Geth RPC calls

1. Easiest thing is use docker.
   ```
    docker build -t geth-varnish ./cache
   ```
   
1. Run the docker instance against your geth.
   ```
   docker run -d --name geth-cache --net host -e GETH_HTTP_HOST=localhost -e GETH_HTTP_PORT=8545 -e VARNISH_PORT=8081 -e CACHE_SIZE=1g geth-varnish
   ```

1. Run the daemon against the varnish port.
   ```
   docker run -d --name=geth-proxy --restart=on-failure:3 --net=host -v /data/geth-proxy:/data geth-proxy --addr=:8080 --geth-endpoint-http=http://localhost:8081 --geth-endpoint-websocket=ws://localhost:8546 --db-path=/data/mainnet.db --development
   ```
   
### Setup web dev environment

1. Create `env` file:
   ```
   cp .env .env.local
   ```

1. Add your geth ws url to `.env.local` point it to your daemon port:
   ```
   REACT_APP_WEB3_URL=localhost:8080
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
   open http://mainnet.go.localhost:3000:
   ```

### Some devops maintenance

**Send transactions to testnet** 

Install web3 CLI client `curl -LSs https://raw.githubusercontent.com/gochain/web3/master/install.sh | sh` use it to create a test account, and you can use it to send transactions.

**Access geth console**
If you ran the `mainnet` docker geth, you can just do, not `rm` is there so it cleans the container up after closing!:
```
docker run --rm -ti -v /data:/data ethereum-node --datadir=/data/mainnet attach  
```
