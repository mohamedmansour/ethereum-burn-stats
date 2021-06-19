import { useContext, createContext, useEffect, useState } from "react"
import { useEthereum } from "./EthereumContext"
import { ethers, utils } from 'ethers'
import { BurnedBlockTransactionString } from '../pages/EthBlockList';
import { useSetting } from "../hooks/useSetting";
import { Setting } from "./SettingsContext";
import { Loader } from "../components/Loader";


interface BlockExplorerDetails {
  totalBurned: string
  gasPrice: string
  currentBlock: number
}

type BlockExplorerContextType = {
  details?: BlockExplorerDetails,
  blocks?: BurnedBlockTransactionString[]
}

const BlockExplorerContext = createContext<BlockExplorerContextType>({
  details: undefined,
  blocks: undefined
})

const useBlockExplorer = () => useContext(BlockExplorerContext);

const BlockExplorerProvider = ({
  children
}: {
  children: React.ReactNode
}) => {
  const { eth } = useEthereum()
  const [details, setDetails] = useState<BlockExplorerDetails>()
  const [blocks, setBlocks] = useState<BurnedBlockTransactionString[]>()
  const maxBlocksToRender = useSetting<number>(Setting.maxBlocksToRender)

  useEffect(() => {
    if (!eth)
      return

    const onNewBlockHeader = async (blockNumber: number) => {
      const block = await eth.getBlock(blockNumber)
      if (!block)
        return

      const gasPriceInBN = await eth.getGasPrice()
      const gasPrice = utils.formatUnits(gasPriceInBN, 'gwei')
      const blockNumberInHex = utils.hexlify(blockNumber)
      const burned = await eth.burned(blockNumberInHex, blockNumberInHex)

      setDetails((oldDetails) => {
        let totalBurned = oldDetails?.totalBurned || '0'
        if (burned !== '0x0') {
          if (totalBurned) {
            const burnedInBN = ethers.BigNumber.from(burned)
            const totalInHex = utils.parseUnits(totalBurned, 'ether')
            const totalInBN = ethers.BigNumber.from(totalInHex)
            totalBurned = utils.formatUnits(burnedInBN.add(totalInBN).toHexString(), 'ether')
          } else {
            totalBurned = utils.formatUnits(burned, 'ether')
          }
        }

        return {
          currentBlock: blockNumber,
          totalBurned,
          gasPrice
        }
      })

      const ethRewards = utils.formatUnits(await eth.getBlockReward(blockNumberInHex), 'ether')
      const weiBaseFee = utils.formatUnits(await eth.getBaseFeePerGas(blockNumberInHex), 'wei')
      const weiBurned = utils.formatUnits(burned, 'wei')
      setBlocks(blocks => {
        if (!blocks)
          blocks = []
        
        return [{
          ...block,
          weiBurned,
          ethRewards,
          weiBaseFee
        }, ...(blocks.slice(0, maxBlocksToRender - 1))]
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
            const ethRewards = utils.formatUnits(await eth.getBlockReward(blockNumberInHex), 'ether')
            const weiBaseFee = utils.formatUnits(await eth.getBaseFeePerGas(blockNumberInHex), 'wei')
            const weiBurned = utils.formatUnits(burned, 'wei')

            processedBlocks.push({
              ...block,
              weiBurned,
              ethRewards,
              weiBaseFee
            })
          }
        }

        setBlocks(processedBlocks)
      }

      return latestBlockNumber
    }

    (async () => {
      const totalBurned = utils.formatUnits(await eth.burned(), 'ether')
      const gasPriceInBN = await eth.getGasPrice()
      const gasPrice = utils.formatUnits(gasPriceInBN, 'gwei')

      const blockNumber = await prefetchBlockHeaders(process.env.REACT_APP_PREFETCH_BLOCK_COUNT ? parseInt(process.env.REACT_APP_PREFETCH_BLOCK_COUNT) : 10)
      setDetails({
        currentBlock: blockNumber,
        totalBurned,
        gasPrice
      })

      eth.on('block', onNewBlockHeader)
    })()

    return () => { eth.off('block', onNewBlockHeader) }
  }, [eth, maxBlocksToRender])

  return (
    <BlockExplorerContext.Provider
      value={{
        blocks,
        details
      }}>
      {blocks ? children : <Loader>connecting to blockchain</Loader>}
    </BlockExplorerContext.Provider>
  )
}


export { useBlockExplorer, BlockExplorerProvider }