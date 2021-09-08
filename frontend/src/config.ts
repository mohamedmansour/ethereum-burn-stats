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

export interface EthereumNetwork {
  name: string
  key: string
  genesis: number
  chainId: number
}

export const EthereumNetworkOptions: {
  [key: string]: EthereumNetwork
} = {
  mainnet: { name: "Mainnet", key: "mainnet", genesis: 12965000, chainId: 1},
  staging: { name: "Staging", key: "staging", genesis: 12965000, chainId: 1},
};

export enum Setting {
  maxBlocksToRender = "maxBlocksToRender",
  doNotShowChart = "doNotShowChart",
  doNotShowCurrentSession = "doNotShowCurrentSession",
  chartType = "chartType",
  chartSecondaryType = "chartSecondaryType",
  colorMode = "chakra-ui-color-mode"
}

export type DarkLightType = "dark" | "light";

export const ChartTypes: ChartType[] = ["issuance", "basefee", "tips", "gas"]
export const DarkLightTypes: DarkLightType[] = ["dark", "light"]

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
    [Setting.chartSecondaryType]: {
      config: ChartSetting,
      defaultValue: 'basefee',
    },
    [Setting.colorMode]: {
      config: DarkLightSetting,
      defaultValue: 'dark',
    },
  };

// Max WebSocket Reconnection Attempts.
export const maxReconnectionAttempts = 10;

// Sync version with server.
export const serverVersion = "2.0.0";

export const maxBlocksToRenderInTable = 50;
export const maxBlocksToRenderInChart = 300;
export const maxBlocksToRenderInTableMobile = 25;
export const maxBlocksToRenderInChartMobile = 100;
