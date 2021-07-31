import React from 'react';
import ReactDOM from 'react-dom';
import { EthereumProvider } from './contexts/EthereumContext';
import { Routing } from './templates/Routing';
import { ChakraProvider, ColorModeScript, CSSReset } from '@chakra-ui/react';
import customTheme from './theme';
import { SettingsProvider } from './contexts/SettingsContext';
import { BlockExplorerProvider } from './contexts/BlockExplorerContext';
import { CurrencyProvider } from './contexts/CurrencyContext';
import { MobileDetectorProvider } from './contexts/MobileDetectorContext';
import { BrowserRouter, Route, Switch } from 'react-router-dom';
import { Api } from './pages/Api';

function App() {
  const protocol = window.location.protocol === 'http:' ? 'ws:' : 'wss:'
  const url = process.env.NODE_ENV === 'production'
    ? `${protocol}//${window.location.host}/ws`
    : `${protocol}//${process.env.REACT_APP_WEB3_URL}`

  return (
    <React.StrictMode>
      <ColorModeScript />
      <ChakraProvider theme={customTheme}>
        <CSSReset />
        <BrowserRouter>
          <Switch>
            <Route exact path="/api" component={Api} />
            <SettingsProvider>
              <EthereumProvider url={url}>
                <BlockExplorerProvider>
                  <CurrencyProvider>
                    <MobileDetectorProvider>
                      <Routing />
                    </MobileDetectorProvider>
                  </CurrencyProvider>
                </BlockExplorerProvider>
              </EthereumProvider>
            </SettingsProvider>
          </Switch>
        </BrowserRouter>
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

