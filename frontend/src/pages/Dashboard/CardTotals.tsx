import { HStack, Text } from '@chakra-ui/react';
import { FaBurn } from 'react-icons/fa';
import { Card } from "../../atoms/Card";
import { BigNumberText } from "../../organisms/BigNumberText";
import { useBlockExplorer } from '../../contexts/BlockExplorerContext';

export function CardTotals() {
  const { data: { details: { totals } } } = useBlockExplorer();
  const amount = 1

  return (
    <Card 
        title="Totals since EIP-1559"
        icon={FaBurn}>
      <HStack>
        <Text flex={1}>Burned</Text>
        <BigNumberText number={totals.burned} usdConversion={amount} fontSize={16} textAlign="right" maximumFractionDigits={2} />
      </HStack>
      <HStack>
        <Text flex={1}>Net Issuance</Text>
        <BigNumberText number={totals.issuance} usdConversion={amount} fontSize={16} textAlign="right" maximumFractionDigits={2} />
      </HStack>
      <HStack>
        <Text flex={1}>Net Reduction</Text>
        <HStack display="inline-flex">
        <Text>{totals.netReduction} %</Text>
        </HStack>
      </HStack>
    </Card>
  );
}
