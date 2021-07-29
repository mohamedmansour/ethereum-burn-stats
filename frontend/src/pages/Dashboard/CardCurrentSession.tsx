import { Text, HStack, Icon } from "@chakra-ui/react";
import { FaWaveSquare } from 'react-icons/fa';
import { BlockExplorerSession } from "../../contexts/BlockExplorerContext";
import { Card } from "../../atoms/Card";
import { BigNumberText } from "../../organisms/BigNumberText";

export function CardCurrentSession({ session, amount }: { session: BlockExplorerSession; amount: number; }) {
  return (
    <Card gridGap={4}>
      <HStack pr={10}>
        <Icon as={FaWaveSquare} />
        <Text fontSize="md" fontWeight="bold">
          Current Session
        </Text>
      </HStack>
      <HStack>
        <Text flex={1}>Burned</Text>
        <BigNumberText number={session.burned} usdConversion={amount} fontSize={16} />
      </HStack>
      <HStack>
        <Text flex={1}>Rewards</Text>
        <BigNumberText number={session.rewards} usdConversion={amount} fontSize={16} />
      </HStack>
      <HStack>
        <Text flex={1}>Blocks</Text>
        <Text fontSize={16}>{session.blockCount}</Text>
      </HStack>
      <HStack>
        <Text flex={1}>Lowest Base Fee</Text>
        <BigNumberText number={session.minBaseFee} fontSize={16} />
      </HStack>
      <HStack>
        <Text flex={1}>Highest Base Fee</Text>
        <BigNumberText number={session.maxBaseFee} fontSize={16} />
      </HStack>
    </Card>
  );
}
