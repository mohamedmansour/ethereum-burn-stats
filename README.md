# Ethereum Burn Website
When EIP-1559 gets deployed, ETH will be burned in every block if transactions exist. This website will show you how much ETH got burned in total and per block.

## Server Costs
The costs of running this experiment is pretty high since it requires a dev version of Geth to be up and running which requires lots of memory and cpu. The VM and SSD storage currently costs exactly $150/month USD. If you would like to help out with the costs, please reach out to me. If you would like to tip, my ethereum address is `mansour.eth`

## Setup dev environment
1. Clone geth and build docker image. Assumes `/data` on local system exists
   ```
   git clone https://github.com/ethereum/go-ethereum.git
   cd go-ethereum
   docker build -t ethereum-node .
   mkdir /data/geth
   ```

1. To run Geth inside Docker, note `calaveras` testnet is needed for this to work:
   ```
   docker run --rm -p 8546:8546 -p 8547:8547 -p 30303:30303 --name=geth -dti -v /data/geth:/data ethereum-node --datadir=/data/geth --http --http.addr="0.0.0.0" --http.port="8547" --calaveras --http.api="eth,debug" --http.corsdomain="localhost"  --ws --ws.addr="0.0.0.0" --ws.port="8546" --ws.api="eth,debug" --ws.origins="*"
   ```

1. Create `env` file:
   ```
   cp .env .env.local
   ```

1. Add your geth ws url to `.env.local`:
   ```
   REACT_APP_WEB3_URL=127.0.0.1:8546
   ```

1. Install packages
   ```
   npm install
   ```

1. Run the web app:
   ```
   npm start
   ```
