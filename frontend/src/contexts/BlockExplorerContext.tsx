import { useContext, createContext, useEffect, useState } from "react"
import { useEthereum } from "./EthereumContext"
import { BigNumber } from 'ethers'
import { Loader } from "../organisms/Loader";
import { serverVersion, Setting } from "../config";
import { BigNumberMax, BigNumberMin, Zero } from "../utils/number";
import { BlockData, BlockStats, BlockWithTransactions, InitialData, Totals } from "../libs/ethereum";
import { Announcement } from "../organisms/Announcement";
import { useSettings } from "./SettingsContext";

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
  version: string
}

interface BlocksChanged {
  details?: BlockExplorerDetails
  blocks?: BlockStats[]
  session?: BlockExplorerSession
}

type BlockExplorerContextType = {
  data: BlocksChanged
  error?: string
  getBlockStats?(index: number): BlockStats | undefined
}

const BlockExplorerContext = createContext<BlockExplorerContextType>({ data: {}})

const useBlockExplorer = () => useContext(BlockExplorerContext);

interface InMemoryIndex {
  insert: (data: BlockData) => void
  setMaxBlocksToRender: (maxBlocks: number) => void
  getBlockStats: (index: number) => BlockStats | undefined
  getData: () => BlocksChanged
}

const CreateMemoryIndex = (initialData: InitialData): InMemoryIndex => {
  const blockIndex: {[blockNumber: number]: BlockStats} = {}
  let blocks: number[] = []

  const details: BlockExplorerDetails = {
    currentBlock: initialData.blockNumber,
    currentBaseFee: initialData.blocks.length ? initialData.blocks[0].baseFee : Zero(),
    totals: initialData.totals,
    clients: initialData.clients,
    version: initialData.version
  }

  const session: BlockExplorerSession = {
    blockCount: 0,
    burned: Zero(),
    rewards: Zero(),
    tips: Zero(),
    transactionCount: 0,
    since: Date.now()
  }

  const getData = (): BlocksChanged => {
    return {
      details,
      session,
      blocks: blocks.map((blockNumber: number) => blockIndex[blockNumber]),
    }
  }

  const setMaxBlocksToRender = (maxBlocks: number) => {
    console.log('Max Blocks');
  }

  const insert = (data: BlockData) => {
    const { block, totals, clients, version } = data

    if (!block.burned.isZero()) {
      session.burned = session.burned.add(block.burned)
    }

    if (!block.tips.isZero()) {
      session.tips = session.tips.add(block.tips)
    }

    if (!block.rewards.isZero()) {
      session.rewards = session.rewards.add(block.rewards)
    }

    details.currentBaseFee = block.baseFee
    details.currentBlock = block.number
    details.totals = totals
    details.clients = clients
    details.version = version
    session.blockCount = session.blockCount + 1
    session.transactionCount = session.transactionCount + block.transactions
    session.minBaseFee = session.minBaseFee ? BigNumberMin(block.baseFee, session.minBaseFee) : block.baseFee
    session.maxBaseFee = session.maxBaseFee ? BigNumberMax(block.baseFee, session.maxBaseFee) : block.baseFee

    blockIndex[block.number] = block
    blocks = [block.number, ...blocks]
    
  }

  const getBlockStats = (blockNumber: number): BlockStats => {
    return blockIndex[blockNumber]
  }

  initialData.blocks.forEach((block: BlockStats) => {
    blockIndex[block.number] = block
    blocks.push(block.number)
  })

  return {
    insert,
    setMaxBlocksToRender,
    getBlockStats,
    getData
  }
}

const BlockExplorerProvider = ({
  children
}: {
  children: React.ReactNode
}) => {
  const { eth } = useEthereum()
  const settings = useSettings()
  const [db, setDb] = useState<InMemoryIndex>()
  const [error, setError] = useState<string>()
  const [data, setData] = useState<BlocksChanged>({})

  useEffect(() => {
    if (!eth)
      return

    let index: InMemoryIndex;

    const onVersionError = (version: string) => {
      if (serverVersion !== version) {
        setError(`New website update available, please refresh to get the new updates.`)
        return true;
      }

      return false;
    }

    const onNewData = (data: BlockData) => {
      if (onVersionError(data.version)) {
        return;
      }

      index.insert(data)
      setData(index.getData())
    }

    const onMaxBlocksToRenderChanged = (value: number) => {
      index.setMaxBlocksToRender(value);
    }

    const init = async () => {
      const initialData = await eth.getInitialData()
      if (onVersionError(initialData.version)) {
        return;
      }

      index = CreateMemoryIndex(initialData)
      setDb(index);
      setData(index.getData())
    }

    init()

    eth.on('data', onNewData)
    settings.on(Setting.maxBlocksToRender, onMaxBlocksToRenderChanged)
    
    return () => {
      eth.off('data', onNewData)
      settings.off(Setting.maxBlocksToRender, onMaxBlocksToRenderChanged)
    }
  }, [eth, settings])

  return (
    <BlockExplorerContext.Provider
      value={{data: data, getBlockStats: db?.getBlockStats}}>
      {!db && error ? <Announcement isOverlay /> : null }
      {db ? children : <Loader>retrieving latest blocks on {eth?.connectedNetwork.name}</Loader>}
    </BlockExplorerContext.Provider>
  )
}

export { useBlockExplorer, BlockExplorerProvider }
