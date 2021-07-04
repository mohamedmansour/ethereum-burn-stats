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
  port: number
}

export const EthereumNetworkOptions: {
  [key: string]: EthereumNetwork
} = {
  ropsten: { name: "Ropsten (testnet)", key: "ropsten", genesis: 10499401, chainId: 3, port: 8556 },
  goerli: { name: "Goerli (testnet)", key: "goerli", genesis: 5062605, chainId: 5, port: 8566 },
  rinkeby: { name: "Rinkeby (testnet)", key: "rinkeby", genesis: 8897988, chainId: 4, port: 8576 },
  mainnet: { name: "Mainnet", key: "mainnet", genesis: Number.POSITIVE_INFINITY, chainId: 1, port: Number.POSITIVE_INFINITY},
};

export enum Setting {
  maxBlocksToRender = "maxBlocksToRender"
}

export const defaultNetwork = EthereumNetworkOptions['ropsten']
export const defaultSettings: { [key: string]: DefaultSettingValue } =
  {
    [Setting.maxBlocksToRender]: {
      config: IntegerSetting,
      defaultValue: 50,
    },
  };
