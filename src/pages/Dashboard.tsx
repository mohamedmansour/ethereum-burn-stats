import { useWeb3 } from '../contexts/Web3Context';
import { useEffect, useState } from 'react';
import Web3 from 'web3';
import { BlockTransactionString } from 'web3-eth';

interface BurnedBlockTransactionString extends BlockTransactionString {
  gweiBurned: string
}

export function DashboardPage() {
  const { web3 } = useWeb3()
  const [totalBurned, setTotalBurned] = useState<string>()
  const [blocks, setBlocks] = useState<BurnedBlockTransactionString[]>([])

  useEffect(() => {
    (async () => {
      if (!web3)
        return

      setTotalBurned(Web3.utils.fromWei(await web3.debug.burned()))

      const latestBlockNumber = await web3.eth.getBlockNumber()
      const blockNumberInHexEnd = web3.utils.toHex(latestBlockNumber)

      if (latestBlockNumber) {
        const processedBlocks: BurnedBlockTransactionString[] = []
        for (var i = 0; i < 10; i++) {
          const blockNumber = latestBlockNumber - i
          const blockNumberInHexStart = web3.utils.toHex(blockNumber - 1)
          const block = await web3.eth.getBlock(blockNumber)

          if (block) {
            console.log(block)
            const burned = await web3.debug.burned(blockNumberInHexStart, blockNumberInHexEnd)
            processedBlocks.push({
              ...block,
              gweiBurned: Web3.utils.fromWei(burned)
            })
          }
        }

        setBlocks(processedBlocks)
      }
    })()
  }, [web3])

  return (
    <div>
      <h1>ETH Burn</h1>
      <div>
        <h2>Total</h2>
        <div>{totalBurned} ETH</div>
      </div>
      <div>
        <h2>Latest Blocks</h2>
        <table>
          <thead>
            <tr>
              <th>hash</th>
              <th>gas used</th>
              <th>transaction count</th>
              <th>burned</th>
            </tr>
          </thead>
          <tbody>
            {blocks.map((block, idx) => (
              <tr key={idx}>
                <td>
                  {block.hash.substr(0, 10)}
                </td>
                <td>
                  {block.gasUsed}
                </td>
                <td>
                  {block.transactions.length}
                </td>
                <td>
                  {block.gweiBurned}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}