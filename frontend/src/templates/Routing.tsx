import { Dashboard } from '../pages/Dashboard/Dashboard';
import { Layout } from './Layout';
import { Redirect, Route, Switch } from 'react-router-dom';
import { EthBlockDetail } from '../pages/BlockDetail';
import { EthTransactionDetail } from '../pages/TransactionDetail';
import { EthAccountDetail } from '../pages/AccountDetail';
import { Settings } from '../pages/Settings';

export function Routing() {
  return (
    <Layout direction="column">
      <Switch>
        <Route exact path="/account/:id">
          <EthAccountDetail />
        </Route>
        <Route exact path="/block/:id">
          <EthBlockDetail />
        </Route>
        <Route exact path="/transaction/:id">
          <EthTransactionDetail />
        </Route>
        <Route exact path="/settings">
          <Settings />
        </Route>
        <Route exact path="/">
          <Dashboard />
        </Route>
        <Redirect to="/" />
      </Switch>
    </Layout>
  )
}