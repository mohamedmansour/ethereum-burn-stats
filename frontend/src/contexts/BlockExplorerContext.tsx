import { useContext, createContext, useEffect } from "react"
import { useEthereum } from "./EthereumContext"
import { BigNumber } from 'ethers'
import { useSetting } from "../hooks/useSetting";
import { Loader } from "../organisms/Loader";
import { useReducer } from "react";
import { Setting } from "../config";
import { BigNumberMax, BigNumberMin, Zero } from "../utils/number";
import { BlockData, BlockStats, BlockWithTransactions, Totals } from "../libs/ethereum";

export interface BurnedBlockTransaction extends BlockWithTransactions {
  stats?: BlockStats
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
  totals: Totals
  currentBlock: number
  currentBaseFee: BigNumber
  clients: number
}

type BlockExplorerContextType = {
  details?: BlockExplorerDetails
  blocks?: BlockStats[]
  session?: BlockExplorerSession
}

interface NewDataAction {
  type: 'NEW_DATA'
  data: BlockData
  maxBlocksToRender: number
}

interface InitAction {
  type: 'INIT'
  details: BlockExplorerDetails
  blocks: BlockStats[]
}

type ActionType =
  | NewDataAction
  | InitAction

const BlockExplorerContext = createContext<BlockExplorerContextType>({
  details: undefined,
  blocks: undefined
})

const useBlockExplorer = () => useContext(BlockExplorerContext);

const blockExplorerReducer = (state: BlockExplorerContextType, action: ActionType): BlockExplorerContextType => {
  switch (action.type) {
    case 'NEW_DATA': {
      if (!state.details || !state.session)
        return state

      const { block, totals, clients } = action.data

      if (!block.burned.isZero()) {
        state.session.burned = state.session.burned.add(block.burned)
      }

      if (!block.tips.isZero()) {
        state.session.tips = state.session.tips.add(block.tips)
      }

      if (!block.rewards.isZero()) {
        state.session.rewards = state.session.rewards.add(block.rewards)
      }

      state.details.currentBaseFee = block.baseFee
      state.details.currentBlock = block.number
      state.session.blockCount = state.session.blockCount + 1
      state.session.transactionCount = state.session.transactionCount + block.transactions
      state.session.minBaseFee = BigNumberMin(block.baseFee, state.session.minBaseFee)
      state.session.maxBaseFee = BigNumberMax(block.baseFee, state.session.maxBaseFee)

      const newState: BlockExplorerContextType = {
        details: { ...state.details, totals, clients },
        blocks: [block, ...((state.blocks || []).slice(0, action.maxBlocksToRender - 1))],
        session: state.session
      }

      return newState
    }
    case 'INIT': {
      const session: BlockExplorerSession = {
        blockCount: 0,
        burned: Zero(),
        rewards: Zero(),
        tips: Zero(),
        transactionCount: 0,
        minBaseFee: BigNumber.from(Number.MAX_SAFE_INTEGER.toString()),
        maxBaseFee: BigNumber.from(Number.MIN_SAFE_INTEGER.toString()),
      }

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

    const onNewData = async (data: BlockData) => {
      dispatch({
        type: 'NEW_DATA',
        data,
        maxBlocksToRender
      })
    }

    const init = async () => {
      const initialData = await eth.getInitialData()
      
      let currentBaseFee = Zero()
      if (initialData.blocks.length) {
        const block = initialData.blocks[0]
        currentBaseFee = block.baseFee
      } 
      
      const details: BlockExplorerDetails = {
        currentBlock: initialData.blockNumber,
        currentBaseFee: currentBaseFee,
        totals: initialData.totals,
        clients: initialData.clients
      }

      dispatch({ type: 'INIT', details, blocks: initialData.blocks })

      eth.on('data', onNewData)
    }

    init()

    return () => {
      eth.off('data', onNewData)
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
