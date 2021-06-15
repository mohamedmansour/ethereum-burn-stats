import React from 'react';
import ReactDOM from 'react-dom';
import { Web3Provider } from './contexts/Web3Context';
import { DashboardPage } from './pages/Dashboard';
import { ChakraProvider, CSSReset } from '@chakra-ui/react';

import customTheme from './theme';

ReactDOM.render(
  <React.StrictMode>
    <ChakraProvider theme={customTheme}>
      <CSSReset />
      <Web3Provider url="ws://localhost:8546">
        <DashboardPage />
      </Web3Provider>
    </ChakraProvider>
  </React.StrictMode>,
  document.getElementById('root')
)

