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

const EthereumNetworkSetting : SettingConfig  = {
  verify: (value: any): boolean => (!!EthereumNetworkOptions[value]),
  convert: (value: string): EthereumNetwork => (EthereumNetworkOptions[value])
}

export interface EthereumNetwork {
  name: string
  key: string
  genesis: number
}

export const EthereumNetworkOptions: {
  [key: string]: EthereumNetwork
} = {
  ropsten: { name: "Ropsten (testnet)", key: "ropsten", genesis: 10499401 },
  goerli: { name: "Goerli (testnet)", key: "goerli", genesis: 5062605 },
  rinkeby: { name: "Rinkeby (testnet)", key: "rinkeby", genesis: 8897988 },
  mainnet: { name: "Mainnet", key: "mainnet", genesis: Number.POSITIVE_INFINITY },
};

export enum Setting {
  formatBurnInGwei = "formatBurnInGwei",
  formatBaseFeeInGwei = "formatBaseFeeInGwei",
  maxBlocksToRender = "maxBlocksToRender",
  network = "network",
}

export const defaultSettings: { [key: string]: DefaultSettingValue } =
  {
    [Setting.formatBurnInGwei]: {
      config: BooleanSetting,
      defaultValue: true,
    },
    [Setting.formatBaseFeeInGwei]: {
      config: BooleanSetting,
      defaultValue: false,
    },
    [Setting.maxBlocksToRender]: {
      config: IntegerSetting,
      defaultValue: 50,
    },
    [Setting.network]: {
      config: EthereumNetworkSetting,
      defaultValue: EthereumNetworkOptions.ropsten,
    },
  };
