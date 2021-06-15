import { EthBlockList } from '../components/EthBlockList';
import { useBlockExplorer } from '../hooks/useBlockExplorer';
import { Layout } from './Layout';
import { Loader } from '../components/Loader';

export function DashboardPage() {
  const [totalBurned, blocks] = useBlockExplorer()

  if (!blocks)
    return <Loader>Loading blocks ...</Loader>

  return (
    <Layout direction="column" totalBurned={totalBurned}>
      <EthBlockList blocks={blocks} />
    </Layout>
  )
}