import React from 'react';
import ReactDOM from 'react-dom';
import { EthereumProvider } from './contexts/EthereumContext';
import { Routing } from './templates/Routing';
import { ChakraProvider, ColorModeScript, CSSReset } from '@chakra-ui/react';
import customTheme from './theme';
import { SettingsProvider } from './contexts/SettingsContext';
import { BlockExplorerProvider } from './contexts/BlockExplorerContext';
import { CurrencyProvider } from './contexts/CurrencyContext';

function App() {
  const protocol = window.location.protocol === 'http:' ? 'ws:' : 'wss:'
  const url = `${protocol}//${process.env.REACT_APP_WEB3_URL}`

  return (
    <React.StrictMode>
      <ColorModeScript />
      <ChakraProvider theme={customTheme}>
        <CSSReset />
        <SettingsProvider>
          <EthereumProvider url={url}>
            <BlockExplorerProvider>
              <CurrencyProvider>
                <Routing />
              </CurrencyProvider>
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

