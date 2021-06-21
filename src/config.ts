import {
  DefaultSettingValue,
  BooleanConverter,
  IntegerConverter,
} from "./contexts/SettingsContext";

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
    [Setting.network]: { convert: String, defaultValue: "calaveras" },
  };
