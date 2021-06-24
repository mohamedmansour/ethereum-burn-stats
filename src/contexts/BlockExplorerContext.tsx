import { useContext, createContext, useEffect } from "react"
import { EthereumApi, useEthereum } from "./EthereumContext"
import { ethers, utils } from 'ethers'
import { useSetting } from "../hooks/useSetting";
import { Loader } from "../components/Loader";
import { useReducer } from "react";
import { EthereumNetwork, Setting } from "../config";

export interface BurnedBlockTransaction extends ethers.providers.Block {
  burned: ethers.BigNumber
  rewards: ethers.BigNumber
  basefee: ethers.BigNumber
}

export interface BlockExplorerSession {
  burned: ethers.BigNumber
  blockCount: number
  transactionCount: number
  rewards: ethers.BigNumber
}

interface BlockExplorerDetails {
  totalBurned: ethers.BigNumber
  gasPrice: ethers.BigNumber
  currentBlock: number
}

type BlockExplorerContextType = {
  details?: BlockExplorerDetails,
  blocks?: BurnedBlockTransaction[]
  session?: BlockExplorerSession
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

export const BlockExplorerApi = {
  fetchDetails: async (eth:  EthereumApi, blockNumber: number, genesisHex: string, skipTotalBurned = false): Promise<BlockExplorerDetails> => {
    const totalBurned = skipTotalBurned ? ethers.BigNumber.from(0) : ethers.BigNumber.from(await eth.burned(genesisHex))
    const gasPrice = await eth.getGasPrice()
    return {
      currentBlock: blockNumber,
      totalBurned,
      gasPrice
    }
  },
  fetchBlock: async (eth:  EthereumApi, blockNumber: number): Promise<BurnedBlockTransaction | undefined> => {
    const blockNumberInHex = utils.hexValue(blockNumber)
    const block = await eth.getBlock(blockNumber)
    if (block) {
      const rewards = ethers.BigNumber.from(await eth.getBlockReward(blockNumberInHex))
      const basefee = ethers.BigNumber.from(await eth.getBaseFeePerGas(blockNumberInHex))
      const burned = ethers.BigNumber.from(await eth.burned(blockNumberInHex, blockNumberInHex))

      return {
        ...block,
        burned,
        rewards,
        basefee
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
      if (!state.details || !action.block || !action.details || !state.session)
        return state
      
      let totalBurned = state.details.totalBurned
      if (!action.block.burned.isZero()) {
        totalBurned = action.block.burned.add(totalBurned)
        state.session.burned = state.session.burned.add(action.block.burned)
      }

      state.session.rewards = state.session.rewards.add(action.block.rewards)
      state.session.blockCount = state.session.blockCount + 1
      state.session.transactionCount = state.session.transactionCount + action.block.transactions.length

      const newState: BlockExplorerContextType  = {
        details: { ...action.details,  totalBurned },
        blocks: [action.block, ...((state.blocks || []).slice(0, action.maxBlocksToRender - 1))],
        session: state.session
      }

      return newState
    }
    case 'INIT': {
      const session: BlockExplorerSession = {
        blockCount: action.blocks.length,
        burned: ethers.BigNumber.from(0),
        rewards: ethers.BigNumber.from(0),
        transactionCount: 0
      }
      
      action.blocks.forEach(block => {
        session.transactionCount += block.transactions.length
        session.burned = block.burned.add(session.burned)
        session.rewards = block.rewards.add(session.rewards)
      })

      return { blocks: action.blocks, details: action.details, session }
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
  const network = useSetting<EthereumNetwork>(Setting.network)
  const genesis = utils.hexValue(network.genesis)

  useEffect(() => {
    if (!eth)
      return

    const onNewBlockHeader = async (blockNumber: number) => {
      const block = await BlockExplorerApi.fetchBlock(eth, blockNumber)
      if (!block)
        return

      const details = await BlockExplorerApi.fetchDetails(eth, blockNumber, genesis, true)

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

    const init = async () => {
      const blocks = await prefetchBlockHeaders(5 /* Ease the server a bit so only 5 initial */)
      if (blocks.length) {
        const details = await BlockExplorerApi.fetchDetails(eth, blocks[0].number, genesis)
        dispatch({ type: 'INIT', details, blocks })
      }
      eth.on('block', onNewBlockHeader)
    }

    init()
    
    return () => { eth.off('block', onNewBlockHeader) }
  }, [eth, maxBlocksToRender, genesis])

  return (
    <BlockExplorerContext.Provider
      value={state}>
      {state.blocks ? children : <Loader>Retrieving blocks</Loader>}
    </BlockExplorerContext.Provider>
  )
}


export { useBlockExplorer, BlockExplorerProvider }