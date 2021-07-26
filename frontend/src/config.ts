import {
  DefaultSettingValue,
  SettingConfig,
} from "./contexts/SettingsContext";

export const BooleanSetting: SettingConfig = {
  verify: (value: any): boolean => (value === "true" || value === "false" || value === true || value === false),
  convert: (value: string): boolean => (value === "true")
}

export const IntegerSetting: SettingConfig = {
  verify: (value: any): boolean => !isNaN(value),
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
  ropsten: { name: "Ropsten (testnet)", key: "ropsten", genesis: 10499401, chainId: 3},
  goerli: { name: "Goerli (testnet)", key: "goerli", genesis: 5062605, chainId: 5 },
  mainnet: { name: "Mainnet", key: "mainnet", genesis: 12965000, chainId: 1},
};

export enum Setting {
  maxBlocksToRender = "maxBlocksToRender"
}

export const defaultNetwork = EthereumNetworkOptions['mainnet']
export const defaultSettings: { [key: string]: DefaultSettingValue } =
  {
    [Setting.maxBlocksToRender]: {
      config: IntegerSetting,
      defaultValue: 50,
    },
  };
