import { useEffect, useState } from "react"
import { useEthereum } from "../contexts/EthereumContext"
import { ethers, utils } from 'ethers'
import { BurnedBlockTransactionString } from '../components/EthBlockList';

export function useBlockExplorer(): [string | undefined, BurnedBlockTransactionString[] | undefined] {
  const { eth } = useEthereum()
  const [totalBurned, setTotalBurned] = useState<string>()
  const [blocks, setBlocks] = useState<BurnedBlockTransactionString[]>()
  
  useEffect(() => {
    if (!eth)
      return

    const onNewBlockHeader = async (blockNumber: number) => {
      const block = await eth.getBlock(blockNumber)
      if (!block)
        return

      const blockNumberInHex = utils.hexlify(blockNumber)
      const burned = await eth.burned(blockNumberInHex, blockNumberInHex)
      if (burned !== '0x0') {
        setTotalBurned(total => {
          const burnedInBN = ethers.BigNumber.from(burned)
          const totalInHex = utils.parseUnits(total || '0', 'ether')
          const totalInBN = ethers.BigNumber.from(totalInHex)
          if (total)
            return utils.formatUnits(burnedInBN.add(totalInBN).toHexString(), 'ether')
          else
            return utils.formatUnits(burned, 'ether')
        })
      }

      setBlocks(blocks => {
        if (!blocks)
          blocks = []
        
        return [{
          ...block,
          weiBurned: utils.formatUnits(burned, 'wei')
        }, ...blocks]
      })
    }

    const prefetchBlockHeaders = async (blockHeaderCount: number) => {
      const latestBlockNumber = (process.env.REACT_APP_START_BLOCK ? parseInt(process.env.REACT_APP_START_BLOCK) : await eth.getBlockNumber())

      if (latestBlockNumber) {
        const processedBlocks: BurnedBlockTransactionString[] = []
        for (var i = 0; i < blockHeaderCount; i++) {
          const blockNumber = latestBlockNumber - i
          const blockNumberInHex = utils.hexlify(blockNumber)
          const block = await eth.getBlock(blockNumber)
          if (block) {
            const burned = await eth.burned(blockNumberInHex, blockNumberInHex)
            processedBlocks.push({
              ...block,
              weiBurned: utils.formatUnits(burned, 'wei')
            })
          }
        }

        setBlocks(processedBlocks)
      }
    }

    (async () => {
      setTotalBurned(utils.formatUnits(await eth.burned(), 'ether'))
      prefetchBlockHeaders(15)
      eth.on('block', onNewBlockHeader)
    })()

    return () => { eth.off('block', onNewBlockHeader) }
  }, [eth])

  return [totalBurned, blocks]
}