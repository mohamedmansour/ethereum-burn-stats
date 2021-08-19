import { HexToBigNumber, HexToNumber } from "../../utils/number"
import { BaseBlock, BlockData, BlockStats, BlockWithTransactions, EthereumSyncing, InitialData, Totals, Transaction } from "./ethereum-types"

export class EthereumApiFormatters {
  static FormatTransaction(t: Transaction): Transaction {
    t.nonce = HexToNumber(t.nonce)
    t.blockNumber = HexToNumber(t.blockNumber)
    t.transactionIndex = HexToNumber(t.transactionIndex)
    t.type = HexToNumber(t.type)
    t.v = HexToNumber(t.v)
    t.gas = HexToBigNumber(t.gas)
    t.gasPrice = HexToBigNumber(t.gasPrice)
    t.maxPriorityFeePerGas = HexToBigNumber(t.maxPriorityFeePerGas)
    t.maxFeePerGas = HexToBigNumber(t.maxFeePerGas)
    t.confirmations = 0
    return t
  }

  static FormatBlock(b: BaseBlock): BaseBlock {
    b.baseFeePerGas = HexToBigNumber(b.baseFeePerGas)
    b.gasLimit = HexToBigNumber(b.gasLimit)
    b.gasUsed = HexToBigNumber(b.gasUsed)
    b.number = HexToNumber(b.number)
    b.size = HexToNumber(b.size)
    b.timestamp = HexToNumber(b.timestamp)
    b.difficulty = HexToNumber(b.difficulty)
    b.totalDifficulty = HexToNumber(b.totalDifficulty)
    return b
  }

  static FormatBlockStats(b: BlockStats): BlockStats | undefined {
    if (!b) return undefined;
    b.baseFee = HexToBigNumber(b.baseFee)
    b.priorityFee = HexToBigNumber(b.priorityFee)
    b.burned = HexToBigNumber(b.burned)
    b.gasTarget = HexToBigNumber(b.gasTarget)
    b.gasUsed = HexToBigNumber(b.gasUsed)
    b.rewards = HexToBigNumber(b.rewards)
    b.tips = HexToBigNumber(b.tips)
    b.number = HexToNumber(b.number)
    b.timestamp = HexToNumber(b.timestamp)
    b.transactions = HexToNumber(b.transactions)
    b.type2transactions = HexToNumber(b.type2transactions)
    return b
  }

  static FormatBlockWithTransactions(b: BlockWithTransactions): BlockWithTransactions {
    b = EthereumApiFormatters.FormatBlock(b) as BlockWithTransactions
    b.transactions = (b.transactions || []).map(EthereumApiFormatters.FormatTransaction)
    return b
  }

  static FormatSync(s: EthereumSyncing | boolean): EthereumSyncing | boolean {
    if (s !== false) {
      s = s as EthereumSyncing
      s.currentBlock = HexToNumber(s.currentBlock)
      s.highestBlock = HexToNumber(s.highestBlock)
      s.startingBlock = HexToNumber(s.startingBlock)
      s.knownStates = HexToNumber(s.startingBlock)
      s.pulledStates = HexToNumber(s.startingBlock)
      return s
    }

    return false
  }

  static FormatTotals(s: Totals): Totals {
    s.burned = HexToBigNumber(s.burned)
    s.rewards = HexToBigNumber(s.rewards)
    s.tips = HexToBigNumber(s.tips)
    s.issuance = HexToBigNumber(s.issuance)
    return s
  }

  static FormatInitialData(d: InitialData): InitialData {
    d.blocks = d.blocks ? d.blocks.map(b => this.FormatBlockStats(b)!) : []
    d.totals = this.FormatTotals(d.totals)
    d.blockNumber = HexToNumber(d.blockNumber)
    return d
  }
  
  static FormatBlockData(b: BlockData): BlockData {
    b.block = this.FormatBlockStats(b.block)!
    b.totals = this.FormatTotals(b.totals)
    return b
  }
}
