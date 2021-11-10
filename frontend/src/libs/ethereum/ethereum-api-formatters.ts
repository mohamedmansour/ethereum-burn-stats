import { BigNumber } from "ethers"
import { AggregatesData } from "."
import { HexToBigNumber, HexToNumber } from "../../utils/number"
import { BaseBlock, BaseData, BlockData, BlockStats,  EthereumSyncing, InitialData, Totals } from "./ethereum-types"

const caclulateNetReduction = (burned: BigNumber, issuance: BigNumber): number => {
  return burned.mul(BigNumber.from(10000)).div(burned.add(issuance)).toNumber() / 100
}

export class EthereumApiFormatters {
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
    s.baseFee = HexToBigNumber(s.baseFee)
    s.burned = HexToBigNumber(s.burned)
    s.rewards = HexToBigNumber(s.rewards)
    s.tips = HexToBigNumber(s.tips)
    s.issuance = HexToBigNumber(s.issuance)
    s.netReduction = caclulateNetReduction(s.burned, s.issuance)
    return s
  }

  static FormatInitialData(d: InitialData): InitialData {
    d.blocks = d.blocks ? d.blocks.map(b => this.FormatBlockStats(b)!) : []
    d.blockNumber = HexToNumber(d.blockNumber)
    this.FormatAllTotals(d)
    return d
  }

  static FormatAllTotals(b: BaseData): BaseData {
    b.totals = this.FormatTotals(b.totals)
    b.totalsHour = this.FormatTotals(b.totalsHour)
    b.totalsDay = this.FormatTotals(b.totalsDay)
    b.totalsWeek = this.FormatTotals(b.totalsWeek)
    b.totalsMonth = this.FormatTotals(b.totalsMonth)
    return b
  }
  
  static FormatBlockData(b: BlockData): BlockData {
    b.block = this.FormatBlockStats(b.block)!
    this.FormatAllTotals(b)
    return b
  }

  static FormatAggregatesData(d: AggregatesData): AggregatesData {
    d.totalsPerHour = d.totalsPerHour.map(t => ({...this.FormatTotals(t), id: t.id}))
    d.totalsPerDay = d.totalsPerDay.map(t => ({...this.FormatTotals(t), id: t.id}))
    d.totalsPerMonth = d.totalsPerMonth.map(t => ({...this.FormatTotals(t), id: t.id}))
    return d
  }
}
