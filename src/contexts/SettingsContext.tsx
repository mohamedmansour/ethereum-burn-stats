import React, { useContext } from 'react';
import { defaultSettings, Setting } from '../config';

export interface Converter<T> {
  (value: string): T
}

export function BooleanConverter(value: string): boolean {
  return value === "true"
}

export function IntegerConverter(value: string): number {
  return parseInt(value)
}

export interface DefaultSettingValue<T> {
  defaultValue: any
  convert: Converter<T>
  verify: (value: any) => boolean
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
    return localStorage[key] === undefined ? converter.defaultValue : converter.convert(localStorage[key])
  }
  
  const set = (key: Setting, value: any): void => {
    localStorage[key] = value
    event.emit(key, value)
  }

  // Verify settings are correct.
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      const setting = defaultSettings[key];
      if (!setting || !setting.verify(localStorage[key])) {
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