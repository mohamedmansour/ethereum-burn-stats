import { Flex } from "@chakra-ui/react";
import { layoutConfig } from "../../layoutConfig";
import { useMobileDetector } from "../../contexts/MobileDetectorContext";
import { CardBlocks } from "../Cards/CardBlocks";
import { CardLiveChart } from "../Cards/CardLiveChart";

export interface ActivationObj {
  blocksRemaining: number
  blockTimeInSec: string
  estimatedTime: string
}

export function Dashboard() {
  const { isMobile, isPortrait } = useMobileDetector();

  if (isMobile) {
    return (
      <>
        <CardLiveChart type="primary" charts={["issuance", "basefee", "tips", "gas"]} />
        <CardBlocks />
      </>
    )
  }

  return (
    <Flex direction="column" flex={1} gridGap={layoutConfig.gap}>
      {isPortrait && (
        <CardLiveChart type="primary" charts={["issuance", "basefee", "tips", "gas"]} />
      )}
      {!isPortrait && (
        <Flex direction="row" gridGap={layoutConfig.gap}>
          <CardLiveChart flex={1} type="primary" charts={["issuance", "tips"]} />
          <CardLiveChart flex={1} type="secondary" charts={["basefee", "gas"]} />
        </Flex>
      )}
      <CardBlocks />
    </Flex>
  )
}
