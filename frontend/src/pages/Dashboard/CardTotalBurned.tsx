import { Text, HStack, Icon } from "@chakra-ui/react";
import { FaBurn } from 'react-icons/fa';
import { Card } from "../../atoms/Card";
import { BigNumberText } from "../../organisms/BigNumberText";
import { ethers } from "ethers";

export function CardTotalBurned({ totalBurned, amount }: { totalBurned: ethers.BigNumber; amount: number; }) {
  return (
    <Card
      gridGap={2}
      w={["100%", "100%", 300]}
    >
      <HStack pr={10}>
        <Icon as={FaBurn} />
        <Text fontSize="md" fontWeight="bold">
          Total Burned
        </Text>
      </HStack>
      <BigNumberText number={totalBurned} usdConversion={amount} fontSize={24} textAlign="right" />
    </Card>
  );
}
