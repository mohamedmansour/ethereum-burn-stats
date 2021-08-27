import {
  Flex,
} from "@chakra-ui/react";
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

function DashboardLayout({ children }: { children: React.ReactNode; }) {
  return (
    <Flex flex={1} direction="column" m={layoutConfig.gap} gridGap={layoutConfig.gap}>
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
          <CardLatestStats />
          <CardCurrentSession />
          <CardDonate type={CardDonateType.BottomSideBar} />
        </Flex>
        <Flex direction="column" flex={1} gridGap={layoutConfig.gap}>
          <Flex direction="row" gridGap={layoutConfig.gap}>
            <CardTotals />
            <CardLiveChart flex={1} />
          </Flex>
          <CardBlocks />
        </Flex>
      </Flex>
    </DashboardLayout>
  )
}
