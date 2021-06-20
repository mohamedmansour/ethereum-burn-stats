import { useContext, createContext, useEffect } from "react"
import { EthereumApi, useEthereum } from "./EthereumContext"
import { ethers, utils } from 'ethers'
import { useSetting } from "../hooks/useSetting";
import { Setting } from "./SettingsContext";
import { Loader } from "../components/Loader";
import { useReducer } from "react";

export interface BurnedBlockTransaction extends ethers.providers.Block {
  weiBurned: string
  ethRewards: string
  weiBaseFee: string
}

interface BlockExplorerDetails {
  totalBurned: string
  gasPrice: string
  currentBlock: number
}

type BlockExplorerContextType = {
  details?: BlockExplorerDetails,
  blocks?: BurnedBlockTransaction[]
}

interface NewBlockAction {
  type: 'NEW_BLOCK'
  details: BlockExplorerDetails
  block: BurnedBlockTransaction
  maxBlocksToRender: number
}

interface InitAction {
  type: 'INIT'
  details: BlockExplorerDetails
  blocks: BurnedBlockTransaction[]
}

type ActionType =
  | NewBlockAction
  | InitAction

const BlockExplorerApi = {
  fetchDetails: async (eth:  EthereumApi, blockNumber: number, skipTotalBurned = false): Promise<BlockExplorerDetails> => {
    const totalBurned = skipTotalBurned ? '0' : utils.formatUnits(await eth.burned(), 'ether')
    const gasPrice = utils.formatUnits(await eth.getGasPrice(), 'gwei')
    return {
      currentBlock: blockNumber,
      totalBurned,
      gasPrice
    }
  },
  fetchBlock: async (eth:  EthereumApi, blockNumber: number): Promise<BurnedBlockTransaction | undefined> => {
    const blockNumberInHex = utils.hexlify(blockNumber)
    const block = await eth.getBlock(blockNumber)

    if (block) {
      const ethRewards = utils.formatUnits(await eth.getBlockReward(blockNumberInHex), 'ether')
      const weiBaseFee = utils.formatUnits(await eth.getBaseFeePerGas(blockNumberInHex), 'wei')
      const weiBurned = utils.formatUnits(await eth.burned(blockNumberInHex, blockNumberInHex), 'wei')

      return {
        ...block,
        weiBurned,
        ethRewards,
        weiBaseFee
      }
    }

    return undefined
  }
}

const BlockExplorerContext = createContext<BlockExplorerContextType>({
  details: undefined,
  blocks: undefined
})
  
const useBlockExplorer = () => useContext(BlockExplorerContext);

const blockExplorerReducer = (state: BlockExplorerContextType, action: ActionType): BlockExplorerContextType => {
  switch (action.type) {
    case 'NEW_BLOCK': {
      if (!state.details || !action.block || !action.details)
        return state
      
      let totalBurned = state.details.totalBurned
      if (action.block.weiBurned !== '0') {
        if (totalBurned) {
          const burnedInBN = ethers.BigNumber.from(action.block.weiBurned)
          const totalInHex = utils.parseUnits(totalBurned, 'ether')
          const totalInBN = ethers.BigNumber.from(totalInHex)
          totalBurned = utils.formatUnits(burnedInBN.add(totalInBN).toHexString(), 'ether')
        } else {
          totalBurned = utils.formatUnits(action.block.weiBurned, 'ether')
        }
      }

      const newState: BlockExplorerContextType  = {
        details: { ...action.details,  totalBurned },
        blocks: [action.block, ...((state.blocks || []).slice(0, action.maxBlocksToRender - 1))]
      }

      return newState
    }
    case 'INIT': {
      return { blocks: action.blocks, details: action.details }
    }
    default:
      return state
  }
}

const BlockExplorerProvider = ({
  children
}: {
  children: React.ReactNode
}) => {
  const { eth } = useEthereum()
  const [state, dispatch] = useReducer(blockExplorerReducer, {})
  const maxBlocksToRender = useSetting<number>(Setting.maxBlocksToRender)

  useEffect(() => {
    if (!eth)
      return

    const onNewBlockHeader = async (blockNumber: number) => {
      const block = await BlockExplorerApi.fetchBlock(eth, blockNumber)
      if (!block)
        return

      const details = await BlockExplorerApi.fetchDetails(eth, blockNumber, true)

      dispatch({ type: 'NEW_BLOCK', details, block, maxBlocksToRender })
    }


    const prefetchBlockHeaders = async (blockHeaderCount: number) => {
      const latestBlockNumber = (process.env.REACT_APP_START_BLOCK ? parseInt(process.env.REACT_APP_START_BLOCK) : await eth.getBlockNumber())

      const processedBlocks: BurnedBlockTransaction[] = []
      for (var i = 0; i < blockHeaderCount; i++) {
        const blockNumber = latestBlockNumber - i
        const block = await BlockExplorerApi.fetchBlock(eth, blockNumber)
        if (block)
          processedBlocks.push(block)
      }
      
      return processedBlocks
    }

    (async () => {
      const blocks = await prefetchBlockHeaders(maxBlocksToRender)
      if (blocks.length) {
        const details = await BlockExplorerApi.fetchDetails(eth, blocks[0].number)
        dispatch({ type: 'INIT', details, blocks })
      }
      eth.on('block', onNewBlockHeader)
    })()

    return () => { eth.off('block', onNewBlockHeader) }
  }, [eth, maxBlocksToRender])

  return (
    <BlockExplorerContext.Provider
      value={state}>
      {state.blocks ? children : <Loader>Retrieving {maxBlocksToRender} blocks</Loader>}
    </BlockExplorerContext.Provider>
  )
}


export { useBlockExplorer, BlockExplorerProvider }