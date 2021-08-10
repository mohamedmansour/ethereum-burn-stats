import { useContext, createContext, useEffect } from "react"
import { useEthereum } from "./EthereumContext"
import { BigNumber } from 'ethers'
import { useSetting } from "../hooks/useSetting";
import { Loader } from "../organisms/Loader";
import { useReducer } from "react";
import { serverVersion, Setting } from "../config";
import { BigNumberMax, BigNumberMin, Zero } from "../utils/number";
import { BlockData, BlockStats, BlockWithTransactions, Totals } from "../libs/ethereum";
import { Announcement } from "../organisms/Announcement";

export interface BurnedBlockTransaction extends BlockWithTransactions {
  stats?: BlockStats
}

export interface BlockExplorerSession {
  burned: BigNumber
  tips: BigNumber
  blockCount: number
  transactionCount: number
  rewards: BigNumber
  minBaseFee?: BigNumber
  maxBaseFee?: BigNumber
  since: number
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
  error?: string
}

interface NewVersionAction {
  type: 'NEW_VERSION'
  currentVersion: string
  serverVersion: string
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
  | NewVersionAction
  | NewDataAction
  | InitAction

const BlockExplorerContext = createContext<BlockExplorerContextType>({
  details: undefined,
  blocks: undefined
})

const useBlockExplorer = () => useContext(BlockExplorerContext);

const blockExplorerReducer = (state: BlockExplorerContextType, action: ActionType): BlockExplorerContextType => {
  switch (action.type) {
    case 'NEW_VERSION': {
      return {...state, error: `New website update available, please refresh to get the new updates.`}
    }
    case 'NEW_DATA': {
      if (!state.details || !state.session)
        return state

      const { block, totals, clients, version } = action.data

      if (serverVersion !== version) {
        return {...state, error: `New website update available, please refresh to get the new updates.`}
      }

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
      state.session.minBaseFee = state.session.minBaseFee ? BigNumberMin(block.baseFee, state.session.minBaseFee) : block.baseFee
      state.session.maxBaseFee = state.session.maxBaseFee ? BigNumberMax(block.baseFee, state.session.maxBaseFee) : block.baseFee

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
        since: Date.now()
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
      if (serverVersion !== initialData.version) {
        dispatch({
          type: 'NEW_VERSION',
          currentVersion: serverVersion,
          serverVersion: initialData.version
        })
        return;
      }

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
      {!state.blocks && state.error ? <Announcement isOverlay /> : null }
      {state.blocks ? children : <Loader>retrieving latest blocks on {eth?.connectedNetwork.name}</Loader>}
    </BlockExplorerContext.Provider>
  )
}

export { useBlockExplorer, BlockExplorerProvider }
