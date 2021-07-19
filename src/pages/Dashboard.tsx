import { Home } from './Home';
import { Layout } from './Layout';
import { BrowserRouter, Redirect, Route, Switch } from 'react-router-dom';
import { EthBlockDetail } from './EthBlockDetail';
import { EthTransactionDetail } from './EthTransactionDetail';
import { EthAccountDetail } from './EthAccountDetail';
import { Settings } from './Settings';

export function DashboardPage() {
  return (
    <BrowserRouter>
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
            <Home />
          </Route>
          <Redirect to="/" />
        </Switch>
      </Layout>
    </BrowserRouter>
  )
}