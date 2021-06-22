import {
  DefaultSettingValue,
  BooleanConverter,
  IntegerConverter,
} from "./contexts/SettingsContext";

export const EthereumNetworkOptions: {
  [key: string]: { key: string; name: string };
} = {
  calaveras: { name: "Calaveras (devnet)", key: "calaveras" },
  ropsten: { name: "Ropsten (testnet)", key: "ropsten" },
  goerli: { name: "Goerli (testnet)", key: "goerli" },
  rinkeby: { name: "Rinkeby (testnet)", key: "rinkeby" },
  mainnet: { name: "Mainnet", key: "mainnet" },
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
    },
    [Setting.formatBaseFeeInGwei]: {
      convert: BooleanConverter,
      defaultValue: false,
    },
    [Setting.maxBlocksToRender]: {
      convert: IntegerConverter,
      defaultValue: 15,
    },
    [Setting.network]: {
      convert: String,
      defaultValue: EthereumNetworkOptions.calaveras.key,
    },
  };
