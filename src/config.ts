import {
  DefaultSettingValue,
  BooleanConverter,
  IntegerConverter,
} from "./contexts/SettingsContext";

export const EthereumNetworkOptions: {
  [key: string]: { key: string; name: string, genesis: number };
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

export const defaultSettings: { [key: string]: DefaultSettingValue<unknown> } =
  {
    [Setting.formatBurnInGwei]: {
      convert: BooleanConverter,
      defaultValue: true,
      verify: (v) => typeof(v) === "boolean"
    },
    [Setting.formatBaseFeeInGwei]: {
      convert: BooleanConverter,
      defaultValue: false,
      verify: (v) => typeof(v) === "boolean"
    },
    [Setting.maxBlocksToRender]: {
      convert: IntegerConverter,
      defaultValue: 50,
      verify: (v) => !isNaN(v)
    },
    [Setting.network]: {
      convert: String,
      defaultValue: EthereumNetworkOptions.ropsten.key,
      verify: (v) => !!EthereumNetworkOptions[v]
    },
  };
