import { Text, HStack, Icon } from "@chakra-ui/react";
import { FaGasPump } from 'react-icons/fa';
import { BlockExplorerDetails } from "../../contexts/BlockExplorerContext";
import { Card } from "../../atoms/Card";
import { BigNumberText } from "../../organisms/BigNumberText";

export function CardLatestStats({ details }: { details: BlockExplorerDetails; }) {
  return (
    <Card gridGap={4}>
      <HStack pr={10}>
        <Icon as={FaGasPump} />
        <Text fontSize="md" fontWeight="bold">
          Latest Stats
        </Text>
      </HStack>
      <HStack>
        <Text flex={1}>Base Fee</Text>
        <BigNumberText number={details.currentBaseFee} fontSize={16} textAlign="right" />
      </HStack>
      <HStack>
        <Text flex={1}>Gas Price</Text>
        <BigNumberText number={details.gasPrice} fontSize={16} textAlign="right" />
      </HStack>
    </Card>
  );
}
