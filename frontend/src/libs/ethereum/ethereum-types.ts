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
  burned: BigNumber
  gasTarget: BigNumber
  gasUsed: BigNumber
  rewards: BigNumber
  tips: BigNumber
  number: number
  timestamp: number
  transactions: number
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

export interface BlockWithTransactions extends BaseBlock {
  transactions: Transaction[];
}

export interface Transaction {
  blockHash: string
  from: string
  hash: string
  input: string
  r: string
  s: string
  to: string
  value: string
  nonce: number
  blockNumber: number
  transactionIndex: number
  type: number
  v: number
  gas: BigNumber
  gasPrice: BigNumber
  maxPriorityFeePerGas: BigNumber
  maxFeePerGas: BigNumber
  confirmations: number
}

export interface Totals {
  burned: BigNumber
  tipped: BigNumber
}