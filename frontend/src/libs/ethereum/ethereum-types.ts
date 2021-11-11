import { BigNumber } from "ethers";

export interface EthereumSyncing {
  currentBlock: number
  highestBlock: number
  startingBlock: number
  knownStates: number
  pulledStates: number
}

export interface BlockStats {
  baseFee: BigNumber
  priorityFee: BigNumber
  burned: BigNumber
  gasTarget: BigNumber
  gasUsed: BigNumber
  rewards: BigNumber
  tips: BigNumber
  number: number
  timestamp: number
  transactions: number
  type2transactions: number
}

export interface BaseBlock {
  baseFeePerGas: BigNumber
  gasLimit: BigNumber
  gasUsed: BigNumber
  number: number
  size: number
  timestamp: number
  difficulty: number
  totalDifficulty: number
  extraData: string
  hash: string
  logsBloom: string
  miner: string
  mixHash: string
  nonce: string
  parentHash: string
  receiptsRoot: string
  sha3Uncles: string
  stateRoot: string
  transactionsRoot: string
}

export interface Block extends BaseBlock {
  transactions: string[]
}

export interface Percentiles {
  Maximum: number,
  Median: number,
  Minimum: number,
  Tenth: number,
  twentyFifth: number,
  seventyFifth: number,
  ninetieth: number,
  ninetyFifth: number,
  ninetyNinth: number,
}

export interface Totals {
  baseFee: number
  baseFeePercentiles: Percentiles
  burned: BigNumber
  rewards: BigNumber
  tips: BigNumber
  issuance: BigNumber
  netReduction: number
}

export interface TotalsWithId extends Totals {
  id: string
}

export interface BaseData {
  clients: number
  totals: Totals
  totalsHour: Totals
  totalsDay: Totals
  totalsWeek: Totals
  totalsMonth: Totals
  version: string
  usdPrice: number
}

export interface InitialData extends BaseData {
  blockNumber: number
  blocks: BlockStats[]
}

export interface BlockData extends BaseData {
  block: BlockStats
}

export interface AggregatesData {
  totalsPerHour: TotalsWithId[]
  totalsPerDay: TotalsWithId[]
  totalsPerMonth: TotalsWithId[]
}
