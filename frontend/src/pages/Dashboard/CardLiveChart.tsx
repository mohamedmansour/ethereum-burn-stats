import { Text, HStack, Icon } from "@chakra-ui/react";
import { FaChartLine } from 'react-icons/fa';
import { Card } from "../../atoms/Card";
import { BaseFeeChart } from "../../organisms/BaseFeeChart";
import { BlockStats } from "../../contexts/EthereumContext";
import { layoutConfig } from "../../layoutConfig";

export function CardLiveChart({ blocks }: { blocks: BlockStats[]; }) {
  return (
    <Card
      gridGap={layoutConfig.miniGap}
      minH={200}
      h={["auto", "auto", 300]} flexShrink={0}
    >
      <HStack>
        <Icon as={FaChartLine} />
        <Text fontSize="md" fontWeight="bold">
          Live Base Fee Chart
        </Text>
      </HStack>
      <BaseFeeChart data={blocks} />
    </Card>
  );
}
