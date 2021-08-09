import { HStack, Text } from '@chakra-ui/react';
import { FaBurn } from 'react-icons/fa';
import { Card } from "../../atoms/Card";
import { BigNumberText } from "../../organisms/BigNumberText";
import { Totals } from '../../libs/ethereum';

export function CardTotals({ totals, amount }: { totals: Totals; amount: number; }) {
  return (
    <Card 
        title="Totals Since 1559"
        icon={FaBurn}
        w={["100%", "100%", 300]}>
          
      <HStack>
        <Text flex={1}>Burned</Text>
        <BigNumberText number={totals.burned} usdConversion={amount} fontSize={16} textAlign="right" />
      </HStack>
      <HStack>
        <Text flex={1}>Issued</Text>
        <BigNumberText number={totals.issuance} usdConversion={amount} fontSize={16} textAlign="right" />
      </HStack>
    </Card>
  );
}
