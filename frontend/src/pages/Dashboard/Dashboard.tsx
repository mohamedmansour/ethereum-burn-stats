import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Flex,
  Text
} from "@chakra-ui/react";
import { Link as ReactLink } from "react-router-dom";
import {
  useBlockExplorer,
} from "../../contexts/BlockExplorerContext";
import { Loader } from "../../organisms/Loader";
import { useEthereum } from "../../contexts/EthereumContext";
import { layoutConfig } from "../../layoutConfig";
import { useMobileDetector } from "../../contexts/MobileDetectorContext";
import { CardBlocks } from "./CardBlocks";
import { CardLiveChart } from "./CardLiveChart";
import { CardLatestStats } from "./CardLatestStats";
import { CardCurrentSession } from "./CardCurrentSession";
import { CardTotalBurned } from "./CardTotalBurned";
import { CardCountdown } from "./CardCountdown";
import { CardDonate, CardDonateType } from "./CardDonate";

export interface ActivationObj {
  blocksRemaining: number
  blockTimeInSec: string
  estimatedTime: string
}

export function BreadcrumbBox() {
  return (
    <Breadcrumb>
      <BreadcrumbItem fontSize="lg" fontWeight="bold">
        <BreadcrumbLink as={ReactLink} to="/blocks">
          Home
        </BreadcrumbLink>
      </BreadcrumbItem>
      <BreadcrumbItem isCurrentPage>
        <Text>Dashboard</Text>
      </BreadcrumbItem>
    </Breadcrumb>
  );
}

function DashboardLayout({ children }: { children: React.ReactNode; }) {
  return (
    <Flex flex={1} direction="column" m={layoutConfig.gap} gridGap={layoutConfig.gap}>
      <BreadcrumbBox />
      {children}
    </Flex>
  );
}

export function Dashboard() {
  const { details, session, blocks } = useBlockExplorer();
  const { eth } = useEthereum();
  const { isMobile } = useMobileDetector();

  if (!eth) return <Loader>connecting to network ...</Loader>;
  if (!details) return <Loader>Loading Details</Loader>
  if (!session) return <Loader>Loading Session</Loader>
  if (!blocks) return <Loader>Waiting for new blocks...</Loader>

  const amount = 1;
  const latestBlock = details.currentBlock;
  const activated = latestBlock > eth.connectedNetwork.genesis

  if (isMobile) {
    return (
      <DashboardLayout>
        <CardDonate type={CardDonateType.TopSideBar} />
        {!activated && <CardCountdown genesisBlock={eth.connectedNetwork.genesis} currentBlock={latestBlock} />}
        {activated && <CardLiveChart blocks={blocks} />}
        <CardTotalBurned totalBurned={details.totals.burned} amount={amount} />
        <CardCurrentSession session={session} amount={amount} />
        <CardLatestStats details={details} clients={details.clients} />
        <CardBlocks activated={activated} />
        <CardDonate type={CardDonateType.BottomSideBar}/>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <Flex flex={1} direction="row" gridGap={layoutConfig.gap}>
        <Flex direction="column" w={300} flexShrink={0} gridGap={layoutConfig.gap}>
          <CardDonate type={CardDonateType.TopSideBar} />
          <CardTotalBurned totalBurned={details.totals.burned} amount={amount} />
          <CardCurrentSession session={session} amount={amount} />
          <CardLatestStats details={details} clients={details.clients} />
          <CardDonate type={CardDonateType.BottomSideBar}/>
        </Flex>
        <Flex direction="column" flex={1} gridGap={layoutConfig.gap}>
          {!activated && <CardCountdown genesisBlock={eth.connectedNetwork.genesis} currentBlock={latestBlock} />}
          {activated && <CardLiveChart blocks={blocks} />}
          <CardBlocks activated={activated} />
        </Flex>
      </Flex>
    </DashboardLayout>
  )
}
