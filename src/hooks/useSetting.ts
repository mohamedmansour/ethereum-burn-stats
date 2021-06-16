import { useEffect, useState } from "react";
import { Setting, useSettings } from "../contexts/SettingsContext";

export function useSetting<T>(setting: Setting): T | undefined {
  const settings = useSettings()
  const [value, setValue] = useState<T>(settings.get(setting))

  useEffect(() => {
    const onSettingChanged = (value: any) => setValue(value)
    settings.on(setting, onSettingChanged)
    return () => settings.off(setting, onSettingChanged)
  }, [settings, setting])

  return value
}