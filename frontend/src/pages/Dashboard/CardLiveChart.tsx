import { Text, HStack, Icon } from "@chakra-ui/react";
import { FaChartLine } from 'react-icons/fa';
import { BurnedBlockTransaction } from "../../contexts/BlockExplorerContext";
import { Card } from "../../atoms/Card";
import { BaseFeeChart } from "../../organisms/BaseFeeChart";

export function CardLiveChart({ blocks }: { blocks: BurnedBlockTransaction[]; }) {
  return (
    <Card
      gridGap={4}
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
