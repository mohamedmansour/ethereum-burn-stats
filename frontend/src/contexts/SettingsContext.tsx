import React, { useContext } from 'react';
import { defaultSettings, Setting } from '../config';

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

type EventCallback = (value: any) => void
const event = {
  list: new Map<Setting, EventCallback[]>(),
  on(setting: Setting, callback: EventCallback) {
    event.list.has(setting) || event.list.set(setting, []);
    event.list.get(setting)!.push(callback);
    return event;
  },

  off(setting: Setting, callback: EventCallback) {
    if (!event.list.has(setting)) return
    const callbacks = event.list.get(setting)!
    const foundCallbackIndex = callbacks.findIndex(callback)
    if (foundCallbackIndex !== -1) {
      callbacks.splice(foundCallbackIndex, 1)
      if (callbacks.length === 0) {
        event.list.delete(setting)
      }
    }
  },

  emit(eventType: Setting, value: any) {
    event.list.has(eventType) &&
    event.list.get(eventType)!.forEach((cb: EventCallback) => {
        cb(value);
      });
  }
};

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
    event.emit(key, defaultSettings[key].config.convert(value))
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
        on: event.on,
        off: event.off
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export { useSettings, SettingsProvider }