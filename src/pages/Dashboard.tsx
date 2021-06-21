import { EthBlockList } from './EthBlockList';
import { Layout } from './Layout';
import { BrowserRouter, Route, Switch } from 'react-router-dom';
import { EthBlockDetail } from './EthBlockDetail';
import { EthTransactionDetail } from './EthTransactionDetail';
import { EthAccountDetail } from './EthAccountDetail';
import { Settings } from './Settings';

export function DashboardPage() {
  return (
    <BrowserRouter>
      <Layout direction="column">
        <Switch>
          <Route path="/account/:id">
            <EthAccountDetail />
          </Route>
          <Route path="/block/:id">
            <EthBlockDetail />
          </Route>
          <Route path="/transaction/:id">
            <EthTransactionDetail />
          </Route>
          <Route path="/settings">
            <Settings />
          </Route>
          <Route path="/">
            <EthBlockList />
          </Route>
        </Switch>
      </Layout>
    </BrowserRouter>
  )
}