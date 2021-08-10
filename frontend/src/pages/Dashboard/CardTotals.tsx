import { HStack, Text } from '@chakra-ui/react';
import { FaBurn } from 'react-icons/fa';
import { Card } from "../../atoms/Card";
import { BigNumberText } from "../../organisms/BigNumberText";
import { Totals } from '../../libs/ethereum';

export function CardTotals({ totals, amount }: { totals: Totals; amount: number; }) {
  return (
    <Card 
        title="Totals since EIP-1559"
        icon={FaBurn}>
      <HStack>
        <Text flex={1}>Burned</Text>
        <BigNumberText number={totals.burned} usdConversion={amount} fontSize={16} textAlign="right" maximumFractionDigits={2} />
      </HStack>
      <HStack>
        <Text flex={1}>Issued</Text>
        <BigNumberText number={totals.issuance} usdConversion={amount} fontSize={16} textAlign="right" maximumFractionDigits={2} />
      </HStack>
    </Card>
  );
}
