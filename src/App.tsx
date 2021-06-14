import logo from './logo.svg';
import './App.css';
import { useWeb3, Web3Provider } from './components/Web3Connect';
import { useEffect, useState } from 'react';
import Web3 from 'web3';

function BlockBurn() {
  const { web3 } = useWeb3()
  const [totalBurned, setTotalBurned] = useState<string>()

  useEffect(() => {
    (async () => {
      if (!web3)
        return

      setTotalBurned(Web3.utils.fromWei(await web3.debug.burned()))

      const latestBlockNumber = await web3.eth.getBlockNumber()
      const blockNumberInHexEnd = web3.utils.toHex(latestBlockNumber)
      if (latestBlockNumber) {
        for (var i=0; i < 100; i++) {
          const blockNumber = latestBlockNumber - i
          const blockNumberInHexStart = web3.utils.toHex(blockNumber - 1)
          const block = await web3.eth.getBlock(blockNumber)
          if (block) {
            const burned = await web3.debug.burned(blockNumberInHexStart, blockNumberInHexEnd)
            console.log(block.hash, burned);
          }
        }
      }
    })()
  }, [])


  return (<div>Total: {totalBurned} ETH</div>)
}

function App() {
  return (
    <Web3Provider url="">
      <BlockBurn />
    </Web3Provider>
  );
}

export default App;
