import React from 'react';
import ReactDOM from 'react-dom';
import { EthereumProvider } from './contexts/EthereumContext';
import { DashboardPage } from './pages/Dashboard';
import { ChakraProvider, CSSReset } from '@chakra-ui/react';
import customTheme from './theme';
import { SettingsProvider } from './contexts/SettingsContext';
import { BlockExplorerProvider } from './contexts/BlockExplorerContext';

function App() {
  const protocol = window.location.protocol === 'http:' ? 'ws:' : 'wss:'
  const url = `${protocol}//${process.env.REACT_APP_WEB3_URL}`

  return (
    <ChakraProvider theme={customTheme}>
      <CSSReset />
      <SettingsProvider>
        <EthereumProvider url={url}>
          <BlockExplorerProvider>
            <DashboardPage />
          </BlockExplorerProvider>
        </EthereumProvider>
      </SettingsProvider>
    </ChakraProvider>
  )
}

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
)

