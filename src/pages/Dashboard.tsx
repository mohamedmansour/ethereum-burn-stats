import { EthBlockList } from './EthBlockList';
import { useBlockExplorer } from '../hooks/useBlockExplorer';
import { Layout } from './Layout';
import { Loader } from '../components/Loader';
import { BrowserRouter, Route, Switch } from 'react-router-dom';
import { EthBlockDetail } from './EthBlockDetail';
import { EthTransactionDetail } from './EthTransactionDetail';

export function DashboardPage() {
  const [totalBurned, blocks] = useBlockExplorer()

  if (!blocks)
    return <Loader>Loading blocks ...</Loader>

  return (
    <BrowserRouter>
      <Layout direction="column" totalBurned={totalBurned}>
        <Switch>
          <Route path="/block/:id">
            <EthBlockDetail />
          </Route>
          <Route path="/transaction/:id">
            <EthTransactionDetail />
          </Route>
          <Route path="/">
            <EthBlockList blocks={blocks} />
          </Route>
        </Switch>
      </Layout>
    </BrowserRouter>
  )
}