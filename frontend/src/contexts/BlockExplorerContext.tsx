import { useContext, createContext, useEffect } from "react"
import { Block, BlockStats, EthereumApi, useEthereum } from "./EthereumContext"
import { BigNumber } from 'ethers'
import { useSetting } from "../hooks/useSetting";
import { Loader } from "../organisms/Loader";
import { useReducer } from "react";
import { prefetchCount, Setting } from "../config";
import { BigNumberMax, BigNumberMin, Zero } from "../utils/number";

export interface BurnedBlockTransaction extends Block {
  stats: BlockStats
}

export interface BlockExplorerSession {
  burned: BigNumber
  tips: BigNumber
  blockCount: number
  transactionCount: number
  rewards: BigNumber
  minBaseFee: BigNumber
  maxBaseFee: BigNumber
}

export interface BlockExplorerDetails {
  totalBurned: BigNumber
  totalTipped: BigNumber
  currentBlock: number
  currentBaseFee: BigNumber
}

type BlockExplorerContextType = {
  details?: BlockExplorerDetails
  blocks?: BlockStats[]
  session?: BlockExplorerSession
  clients?: number
}

interface NewClientsAction {
  type: 'NEW_CLIENTS'
  count: number
}

interface NewBlockAction {
  type: 'NEW_BLOCK'
  block: BlockStats
  maxBlocksToRender: number
}

interface InitAction {
  type: 'INIT'
  details: BlockExplorerDetails
  blocks: BlockStats[]
}

type ActionType =
  | NewClientsAction
  | NewBlockAction
  | InitAction

export const BlockExplorerApi = {
  fetchBlock: async (eth: EthereumApi, blockNumber: number): Promise<BurnedBlockTransaction | undefined> => {
    const block = await eth.getBlock(blockNumber) as BurnedBlockTransaction
    if (block) {
      // const blockStats = await eth.getBlockStats(block.number)
      // block.stats = blockStats
      return block
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
    case 'NEW_CLIENTS': {
      return { ...state, clients: action.count };
    }
    case 'NEW_BLOCK': {
      if (!state.details || !action.block || !state.session)
        return state

      let totalBurned = state.details.totalBurned
      if (!action.block.burned.isZero()) {
        totalBurned = action.block.burned.add(totalBurned)
        state.session.burned = state.session.burned.add(action.block.burned)
      }

      let totalTipped = state.details.totalTipped
      if (!action.block.tips.isZero()) {
        totalTipped = action.block.tips.add(totalTipped)
        state.session.tips = state.session.tips.add(action.block.tips)
      }

      state.session.rewards = state.session.rewards.add(action.block.rewards)
      state.session.blockCount = state.session.blockCount + 1
      state.session.transactionCount = state.session.transactionCount + action.block.transactions
      state.session.minBaseFee = BigNumberMin(action.block.baseFee, state.session.minBaseFee)
      state.session.maxBaseFee = BigNumberMax(action.block.baseFee, state.session.maxBaseFee)

      const newState: BlockExplorerContextType = {
        details: { ...state.details, totalBurned, totalTipped },
        blocks: [action.block, ...((state.blocks || []).slice(0, action.maxBlocksToRender - 1))],
        session: state.session
      }

      return newState
    }
    case 'INIT': {
      const session: BlockExplorerSession = {
        blockCount: action.blocks.length,
        burned: Zero(),
        rewards: Zero(),
        tips: Zero(),
        transactionCount: 0,
        minBaseFee: BigNumber.from(Number.MAX_SAFE_INTEGER.toString()),
        maxBaseFee: BigNumber.from(Number.MIN_SAFE_INTEGER.toString()),
      }

      action.blocks.map(block => {
        const basefee = block.baseFee
        session.transactionCount += block.transactions
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

    const onClient = (count: number) => {
      dispatch({
        type: 'NEW_CLIENTS',
        count
      })
    };

    const onNewBlockHeader = async (block: BlockStats) => {
      dispatch({
        type: 'NEW_BLOCK',
        block,
        maxBlocksToRender
      })
    }

    const prefetchBlockHeaders = async (blockHeaderCount: number): Promise<[number, BlockStats[]]> => {
      const latestBlockNumber = (process.env.REACT_APP_START_BLOCK ? parseInt(process.env.REACT_APP_START_BLOCK) : await eth.getBlockNumber())

      const processedBlocks: BlockStats[] = []
      // for (var i = 0; i < blockHeaderCount; i++) {
      //   const blockNumber = Math.max(0, latestBlockNumber - i)
      //   const block = await eth.getBlockStats(blockNumber)
      //   if (block)
      //     processedBlocks.push(block)
      // }

      return [latestBlockNumber, processedBlocks]
    }

    const init = async () => {
      const totals = await eth.getTotals()
      const [latestBlockNumber, blocks] = await prefetchBlockHeaders(prefetchCount)

      if (blocks.length) {
        const block = blocks[0]
        const details = {
          currentBlock: block.number,
          totalBurned: totals.burned,
          totalTipped: totals.tipped,
          currentBaseFee: block.baseFee
        }
        dispatch({ type: 'INIT', details, blocks })
      } else {
        dispatch({
          type: 'INIT',
          details: {
            currentBlock: latestBlockNumber,
            totalBurned: totals.burned,
            totalTipped: totals.tipped,
            currentBaseFee: Zero()
          }, blocks: []
        })
      }
      eth.on('block', onNewBlockHeader)
      eth.on('client', onClient)
    }

    init()

    return () => {
      eth.off('block', onNewBlockHeader)
      eth.off('client', onClient)
    }
  }, [eth, maxBlocksToRender])

  return (
    <BlockExplorerContext.Provider
      value={state}>
      {state.blocks ? children : <Loader>retrieving latest blocks on {eth?.connectedNetwork.name}</Loader>}
    </BlockExplorerContext.Provider>
  )
}


export { useBlockExplorer, BlockExplorerProvider }
