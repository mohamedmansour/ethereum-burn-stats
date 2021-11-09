import { Dashboard } from '../pages/Dashboard/Dashboard';
import { Layout } from './Layout';
import { BrowserRouter, Redirect, Route, Switch } from 'react-router-dom';
import { Historical } from '../pages/Historical/Historical';
import { Settings } from '../pages/Settings/Settings';
import { About } from '../pages/About/About';

export function Routing() {
  return (
    <BrowserRouter>
      <Layout>
        <Switch>
          <Route exact path="/settings" component={Settings} />
          <Route exact path="/insights" component={Historical} />
          <Route exact path="/about" component={About} />
          <Route exact path="/" component={Dashboard} />
          <Redirect to="/" />
        </Switch>
      </Layout>
    </BrowserRouter>
  )
}
