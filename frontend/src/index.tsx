import React from 'react';
import ReactDOM from 'react-dom';
import ReactGA from 'react-ga';
import { EthereumProvider } from './contexts/EthereumContext';
import { Routing } from './templates/Routing';
import { ChakraProvider, ColorModeScript, CSSReset } from '@chakra-ui/react';
import customTheme from './theme';
import { SettingsProvider } from './contexts/SettingsContext';
import { BlockExplorerProvider } from './contexts/BlockExplorerContext';
import { MobileDetectorProvider } from './contexts/MobileDetectorContext';

const GOOGLE_ANALYTICS_ID: string | undefined = process.env.REACT_APP_GOOGLE_ANALYTICS_ID
if (typeof GOOGLE_ANALYTICS_ID === 'string') {
  ReactGA.initialize(GOOGLE_ANALYTICS_ID, {
    gaOptions: {
      storage: 'none',
      storeGac: false,
    },
  })
  ReactGA.set({
    anonymizeIp: true
  })
} else {
  ReactGA.initialize('test', { testMode: true, debug: true })
}

function App() {
  const protocol = window.location.protocol === 'http:' ? 'ws:' : 'wss:'
  const url = process.env.NODE_ENV === 'production'
    ? `${protocol}//${window.location.host}/ws`
    : `${protocol}//${process.env.REACT_APP_WEB3_URL}`

  return (
    <React.StrictMode>
      <ChakraProvider theme={customTheme}>
        <CSSReset />
        <SettingsProvider>
          <EthereumProvider url={url}>
            <BlockExplorerProvider>
              <MobileDetectorProvider>
                <Routing />
              </MobileDetectorProvider>
            </BlockExplorerProvider>
          </EthereumProvider>
        </SettingsProvider>
      </ChakraProvider>
    </React.StrictMode>
  )
}

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
)

