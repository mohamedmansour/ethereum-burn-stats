import { EthBlockList } from './EthBlockList';
import { Layout } from './Layout';
import { BrowserRouter, Route, Switch } from 'react-router-dom';
import { EthBlockDetail } from './EthBlockDetail';
import { EthTransactionDetail } from './EthTransactionDetail';
import { EthAccountDetail } from './EthAccountDetail';
import { Settings } from './Settings';
import { Home } from './Home';

export function DashboardPage() {
  return (
    <BrowserRouter>
      <Layout direction="column">
        <Switch>
          <Route exact path="/">
            <Home />
          </Route>
          <Route path="/blocks">
            <EthBlockList />
          </Route>
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
        </Switch>
      </Layout>
    </BrowserRouter>
  )
}