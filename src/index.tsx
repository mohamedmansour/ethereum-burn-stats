import React from 'react';
import ReactDOM from 'react-dom';
import { Web3Provider } from './contexts/Web3Context';
import { DashboardPage } from './pages/Dashboard';

ReactDOM.render(
  <React.StrictMode>
    <Web3Provider url="ws://localhost:8546">
        <DashboardPage />
    </Web3Provider>
  </React.StrictMode>,
  document.getElementById('root')
);

