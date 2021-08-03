import { useContext, createContext, useEffect } from "react"
import { EthereumApi, useEthereum } from "./EthereumContext"
import { ethers, utils } from 'ethers'
import { useSetting } from "../hooks/useSetting";
import { Loader } from "../organisms/Loader";
import { useReducer } from "react";
import { Setting } from "../config";
import { BigNumberMax, BigNumberMin, BigNumberNormalize } from "../utils/bignumber";

export interface BurnedBlockTransaction extends ethers.providers.Block {
  burned: ethers.BigNumber
  rewards: ethers.BigNumber
  basefee: ethers.BigNumber
  gasTarget: ethers.BigNumber
}

export interface BlockExplorerSession {
  burned: ethers.BigNumber
  blockCount: number
  transactionCount: number
  rewards: ethers.BigNumber
  minBaseFee: ethers.BigNumber
  maxBaseFee: ethers.BigNumber
}

export interface BlockExplorerDetails {
  totalBurned: ethers.BigNumber
  gasPrice: ethers.BigNumber
  currentBlock: number
  currentBaseFee: ethers.BigNumber
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

const getDefaultBigNumber = (hex: ethers.BigNumberish) => ethers.BigNumber.from(!hex ? '0' : hex)
const safeBurned = async (eth: EthereumApi, blockNumber: number, fetchTotal: boolean = false) => {
  if (eth.connectedNetwork.genesis > blockNumber) {
    return ethers.BigNumber.from(0)
  }

  const blockNumberInHex = utils.hexValue(blockNumber)

  if (fetchTotal) {
    return getDefaultBigNumber(await eth.burned(utils.hexValue(eth.connectedNetwork.genesis), blockNumberInHex))
  }

  return getDefaultBigNumber(await eth.burned(blockNumberInHex, blockNumberInHex))
}

const safeTotalBurned = (eth: EthereumApi, blockNumber: number) => safeBurned(eth, blockNumber, true)

export const BlockExplorerApi = {
  fetchDetails: async (eth:  EthereumApi, block: BurnedBlockTransaction, skipTotalBurned = false): Promise<BlockExplorerDetails> => {
    const totalBurned = skipTotalBurned ? ethers.BigNumber.from(0) : await safeTotalBurned(eth, block.number)
    const gasPrice = BigNumberNormalize(await eth.getGasPrice())
    return {
      currentBlock: block.number,
      totalBurned,
      gasPrice,
      currentBaseFee: block.basefee
    }
  },
  fetchBlock: async (eth:  EthereumApi, blockNumber: number): Promise<BurnedBlockTransaction | undefined> => {
    const block = await eth.getBlock(blockNumber)
    if (block) {
      return BlockExplorerApi.fetchBlockExtra(eth, block)
    }

    return undefined
  },
  fetchBlockExtra: async (eth: EthereumApi, block: ethers.providers.Block): Promise<BurnedBlockTransaction | undefined> => {
    const baseFeePerGas = BigNumberNormalize(block.baseFeePerGas)
    const gasLimit = BigNumberNormalize(block.gasLimit)
    const gasUsed = BigNumberNormalize(block.gasUsed)
    const difficulty = BigNumberNormalize(block.difficulty);
    const number = BigNumberNormalize(block.number)
    
    const blockNumberInHex = utils.hexValue(block.number)
    const rewards = getDefaultBigNumber(await eth.getBlockReward(blockNumberInHex))
    const basefee = BigNumberNormalize(baseFeePerGas)
    const burned =  await safeBurned(eth, block.number)
    const gasTarget = gasLimit.div(2)

    return {
      ...block,
      number: number.toNumber(),
      transactions: block.transactions || [],
      baseFeePerGas,
      gasLimit,
      gasUsed,
      burned,
      rewards,
      basefee,
      gasTarget,
      difficulty: difficulty.toNumber()
    }
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
        transactionCount: 0,
        minBaseFee: ethers.BigNumber.from(Number.MAX_SAFE_INTEGER.toString()),
        maxBaseFee: ethers.BigNumber.from(Number.MIN_SAFE_INTEGER.toString()),
      }
      
      action.blocks.map(block => {
        block.burned = BigNumberNormalize(block.burned)
        block.rewards = BigNumberNormalize(block.rewards)
        block.gasTarget = BigNumberNormalize(block.gasTarget)
        block.gasLimit = BigNumberNormalize(block.gasLimit)
        block.gasUsed = BigNumberNormalize(block.gasUsed)
        block.baseFeePerGas = BigNumberNormalize(block.baseFeePerGas)

        const basefee = BigNumberNormalize(block.baseFeePerGas)
        session.transactionCount += block.transactions.length
        session.burned = block.burned.add(session.burned)
        session.rewards = block.rewards.add(session.rewards)
        session.minBaseFee = BigNumberMin(basefee, session.minBaseFee)
        session.maxBaseFee = BigNumberMax(basefee, session.maxBaseFee)

        return block;
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

  useEffect(() => {
    if (!eth)
      return

    const onNewBlockHeader = async (block: ethers.providers.Block) => {
      const blockWithExtras = await BlockExplorerApi.fetchBlockExtra(eth, block)
      if (!blockWithExtras)
        return

      const details = await BlockExplorerApi.fetchDetails(eth, blockWithExtras, true)

      dispatch({ type: 'NEW_BLOCK', details, block: blockWithExtras, maxBlocksToRender })
    }

    const prefetchBlockHeaders = async (blockHeaderCount: number) => {
      const latestBlockNumber = (process.env.REACT_APP_START_BLOCK ? parseInt(process.env.REACT_APP_START_BLOCK) : await eth.getBlockNumber())

      const processedBlocks: BurnedBlockTransaction[] = []
      for (var i = 0; i < blockHeaderCount; i++) {
        const blockNumber = Math.max(0, latestBlockNumber - i)
        const block = await BlockExplorerApi.fetchBlock(eth, blockNumber)
        if (block)
          processedBlocks.push(block)
      }
      
      return processedBlocks
    }

    const init = async () => {
      const blocks = await prefetchBlockHeaders(10 /* Ease the server a bit so only 5 initial */)
      if (blocks.length) {
        const details = await BlockExplorerApi.fetchDetails(eth, blocks[0])
        dispatch({ type: 'INIT', details, blocks })
      }
      eth.on('block', onNewBlockHeader)
    }

    init()
    
    return () => { eth.off('block', onNewBlockHeader) }
  }, [eth, maxBlocksToRender])

  return (
    <BlockExplorerContext.Provider
      value={state}>
      {state.blocks ? children : <Loader>retrieving latest blocks on {eth?.connectedNetwork.name}</Loader>}
    </BlockExplorerContext.Provider>
  )
}


export { useBlockExplorer, BlockExplorerProvider }