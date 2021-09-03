import {
  Flex,
} from "@chakra-ui/react";
import { layoutConfig } from "../../layoutConfig";
import { useMobileDetector } from "../../contexts/MobileDetectorContext";
import { CardBlocks } from "./CardBlocks";
import { CardLiveChart } from "./CardLiveChart";
import { CardLatestStats } from "./CardLatestStats";
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
  const { isMobile, isPortrait } = useMobileDetector();

  if (isMobile) {
    return (
      <DashboardLayout>
        <CardDonate type={CardDonateType.TopSideBar} />
        <CardTotals />
        <CardLatestStats />
        <CardLiveChart type="primary" charts={["issuance", "tips", "basefee", "gas"]} />
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
          <CardDonate type={CardDonateType.BottomSideBar} />
        </Flex>
        <Flex direction="column" flex={1} gridGap={layoutConfig.gap}>
          {isPortrait && (
            <CardLiveChart type="primary" charts={["issuance", "tips", "basefee", "gas"]} />
          )}
          {!isPortrait && (
            <Flex direction="row" gridGap={layoutConfig.gap}>
              <CardLiveChart flex={1} type="primary" charts={["issuance", "tips"]} />
              <CardLiveChart flex={1} type="secondary" charts={["basefee", "gas"]} />
            </Flex>
          )}
          <CardBlocks />
        </Flex>
      </Flex>
    </DashboardLayout>
  )
}
