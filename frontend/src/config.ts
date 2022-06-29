import {
  DefaultSettingValue,
  SettingConfig,
} from "./contexts/SettingsContext";
import { ChartType } from "./organisms/CryptoChart";

export const BooleanSetting: SettingConfig = {
  verify: (value: any): boolean => (value === "true" || value === "false" || value === true || value === false),
  convert: (value: string): boolean => value.toString() === "true"
}

export const IntegerSetting: SettingConfig = {
  verify: (value: any): boolean => !isNaN(value),
  convert: (value: string): number => parseInt(value)
}

export const ChartSetting: SettingConfig = {
  verify: (value: any): boolean => ChartTypes.indexOf(value) !== -1,
  convert: (value: string): string => value
}

export const DarkLightSetting: SettingConfig = {
  verify: (value: any): boolean => DarkLightTypes.indexOf(value) !== -1,
  convert: (value: string): string => value
}

export const TotalFilterSetting: SettingConfig = {
  verify: (value: any): boolean => !isNaN(value) && parseInt(value) < TotalFilters.length,
  convert: (value: string): number => parseInt(value)
}

export interface EthereumNetwork {
  name: string
  key: string
  genesis: number
  chainId: number
}

export const EthereumNetworkOptions: {
  [key: string]: EthereumNetwork
} = {
  mainnet: { name: "Mainnet", key: "mainnet", genesis: 12965000, chainId: 1 },
  staging: { name: "Staging", key: "staging", genesis: 12965000, chainId: 1 },
};

export enum Setting {
  maxBlocksToRender = "maxBlocksToRender",
  doNotShowChart = "doNotShowChart",
  doNotShowCurrentSession = "doNotShowCurrentSession",
  chartType = "chartType",
  chartSecondaryType = "chartSecondaryType",
  colorMode = "chakra-ui-color-mode",
  totalFilterIndex = "totalFilterIndex",
  insightBucket = "insightBucket",
}

export type DarkLightType = "dark" | "light";
export const ChartTypes: ChartType[] = ["issuance", "basefee", "tips", "gas"]
export const DarkLightTypes: DarkLightType[] = ["dark", "light"]
export const TotalFilters = [
  {
    key: '1H',
    title: 'Total stats over previous 60 minutes'
  },
  {
    key: '1D',
    title: 'Total stats over previous 24 hours'
  },
  {
    key: '7D',
    title: 'Total stats over previous 7 days'
  },
  {
    key: '1M',
    title: 'Total stats over previous 30 days'
  },
  {
    key: 'All',
    title: 'Total stats since EIP-1559 launch'
  }
]

export const defaultNetwork = EthereumNetworkOptions['mainnet']
export const defaultSettings: { [key: string]: DefaultSettingValue } =
{
  [Setting.maxBlocksToRender]: {
    config: IntegerSetting,
    defaultValue: 50,
  },
  [Setting.doNotShowChart]: {
    config: BooleanSetting,
    defaultValue: false,
  },
  [Setting.doNotShowCurrentSession]: {
    config: BooleanSetting,
    defaultValue: false,
  },
  [Setting.chartType]: {
    config: ChartSetting,
    defaultValue: 'issuance',
  },
  [Setting.insightBucket]: {
    config: IntegerSetting,
    defaultValue: 1, /* day */
  },
  [Setting.chartSecondaryType]: {
    config: ChartSetting,
    defaultValue: 'basefee',
  },
  [Setting.colorMode]: {
    config: DarkLightSetting,
    defaultValue: 'dark',
  },
  [Setting.totalFilterIndex]: {
    config: TotalFilterSetting,
    defaultValue: TotalFilters.length - 1,
  },
};

export const Tooltips = {
  rewards: "Rewards is newly minted ethereum: block reward + uncle rewards + uncle inclusion rewards.",
  burned: "Burned is the amount of ETH removed from circulation: gas units (limit) x (base fee).",
  tips: "Tips is the gratuity on top of the basefee that each transaction can optionally have.",
  netIssuance: "Net Issuance the amount of new ETH coming into circulation: rewards - burned.",
  netReduction: "Net Reduction explains how much ETH issuance was reduced after EIP-1559, when this reaches above 100%, it means we are burning more than issuing. Ultra sound money!",
  transactions: "Total Transactions in this block (% type 2).",
  baseFee: "Base Fee is the algorithmically determined price you pay per unit of gas for a transaction. GasQuantity * baseFee is burned.",
  baseFeeInsights: "Base Fee is the algorithmically determined price you pay per unit of gas for a transaction. This shows the minimum, median, and 90th percentile baseFee for all blocks in period. WHen hovering, it will additionally show the maximum base fee.",
  priorityFee: "Priority Fee is a tip to encourage faster inclusion by miners. This shows the median fee provided to be included in block."
}
// Max WebSocket Reconnection Attempts.
export const maxReconnectionAttempts = 10;

// Sync version with server.
export const serverVersion = "3.0.0";

export const maxBlocksToRenderInTable = 50;
export const maxBlocksToRenderInChart = 300;
export const maxBlocksToRenderInTableMobile = 25;
export const maxBlocksToRenderInChartMobile = 100;
