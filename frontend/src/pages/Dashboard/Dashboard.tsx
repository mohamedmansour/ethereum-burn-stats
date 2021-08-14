import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Flex,
  Text
} from "@chakra-ui/react";
import { Link as ReactLink } from "react-router-dom";
import { layoutConfig } from "../../layoutConfig";
import { useMobileDetector } from "../../contexts/MobileDetectorContext";
import { CardBlocks } from "./CardBlocks";
import { CardLiveChart } from "./CardLiveChart";
import { CardLatestStats } from "./CardLatestStats";
import { CardCurrentSession } from "./CardCurrentSession";
import { CardTotals } from "./CardTotals";
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
  const { isMobile } = useMobileDetector();

  if (isMobile) {
    return (
      <DashboardLayout>
        <CardDonate type={CardDonateType.TopSideBar} />
        <CardLiveChart />
        <CardTotals />
        <CardLatestStats />
        <CardCurrentSession />
        <CardBlocks />
        <CardDonate type={CardDonateType.BottomSideBar} />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <Flex flex={1} direction="row" gridGap={layoutConfig.gap}>
        <Flex direction="column" w={300} flexShrink={0} gridGap={layoutConfig.gap}>
          <CardDonate type={CardDonateType.TopSideBar} />
          <CardTotals />
          <CardLatestStats />
          <CardCurrentSession />
          <CardDonate type={CardDonateType.BottomSideBar}/>
        </Flex>
        <Flex direction="column" flex={1} gridGap={layoutConfig.gap}>
          <CardLiveChart />
          <CardBlocks />
        </Flex>
      </Flex>
    </DashboardLayout>
  )
}
