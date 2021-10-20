import { Dashboard } from '../pages/Dashboard/Dashboard';
import { Layout } from './Layout';
import { BrowserRouter, Redirect, Route, Switch } from 'react-router-dom';
import { Settings } from '../pages/Settings';
import { Historical } from '../pages/Historical/Historical';

export function Routing() {
  return (
    <BrowserRouter>
      <Layout direction="column">
        <Switch>
          <Route exact path="/settings">
            <Settings />
          </Route>
          <Route exact path="/historical">
            <Historical />
          </Route>
          <Route exact path="/">
            <Dashboard />
          </Route>
          <Redirect to="/" />
        </Switch>
      </Layout>
    </BrowserRouter>
  )
}
