import React, { useContext } from 'react';
import { defaultSettings, Setting } from '../config';
import { EventEmitter } from '../utils/event';

export interface SettingConfig {
  verify: (value: any) => boolean,
  convert: (value: string) => any
}

export interface DefaultSettingValue {
  defaultValue: any
  config: SettingConfig
}

type SettingsContextType = {
  get: (key: Setting) => any
  set: (key: Setting, value: any) => void
  on: (key: Setting, callback: (value: any) => void) => void
  off: (key: Setting, callback: (value: any) => void) => void
}

const SettingsContext = React.createContext<SettingsContextType>({
  get: () => {},
  set: () => {},
  on: () => {},
  off: () => {}
})

const useSettings = () => useContext(SettingsContext);

const eventEmitter = EventEmitter<Setting>()

const SettingsProvider = ({
  children
}: {
  children: React.ReactNode
}) => {
  const get = (key: Setting): any => {
    const converter = defaultSettings[key]
    return localStorage[key] === undefined ? converter.defaultValue : converter.config.convert(localStorage[key])
  }
  
  const set = (key: Setting, value: any): void => {
    localStorage[key] = value
    eventEmitter.emit(key, defaultSettings[key].config.convert(value))
  }

  // Verify settings are correct.
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      const setting = defaultSettings[key];
      if (!setting || !setting.config.verify(localStorage[key])) {
        localStorage.removeItem(key)
      }
    }
  }

  return (
    <SettingsContext.Provider
      value={{
        get,
        set,
        on: eventEmitter.on,
        off: eventEmitter.off
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export { useSettings, SettingsProvider }