import { Text, HStack, Icon } from "@chakra-ui/react";
import { FaBurn } from 'react-icons/fa';
import { Card } from "../../atoms/Card";
import { BigNumberText } from "../../organisms/BigNumberText";
import { BigNumber } from "ethers";
import { layoutConfig } from "../../layoutConfig";

export function CardTotalBurned({ totalBurned, amount }: { totalBurned: BigNumber; amount: number; }) {
  return (
    <Card
      gridGap={layoutConfig.miniGap}
      w={["100%", "100%", 300]}
    >
      <HStack pr={10}>
        <Icon as={FaBurn} />
        <Text fontSize="md" fontWeight="bold">
          Total Burned
        </Text>
      </HStack>
      <BigNumberText number={totalBurned} usdConversion={amount} fontSize={24} textAlign="right" forced="ether" />
    </Card>
  );
}
