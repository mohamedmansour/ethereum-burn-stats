import { Divider, HStack, Text, VStack } from '@chakra-ui/react';
import { FaBurn } from 'react-icons/fa';
import { Card } from "../../atoms/Card";
import { BigNumberProps, BigNumberText } from "../../organisms/BigNumberText";
import { useBlockExplorer } from '../../contexts/BlockExplorerContext';

export function CardTotals() {
  const { data: { details: { totals, usdPrice } } } = useBlockExplorer();
  const amount = usdPrice

  const textStyle = {
    flex: 1,
    mr: 8
  }

  const cryptoStyle: Partial<BigNumberProps> = {
    fontSize: 16,
    textAlign: "right",
    maximumFractionDigits: -1
  }

  const usdStyle: Partial<BigNumberProps> = {
    fontSize: 12,
    textAlign: "right",
    maximumFractionDigits: -1,
    usdConversion:amount
  }

  const rowStyle = {
    height: "50px"
  }

  return (
    <Card
      title="Totals since EIP-1559"
      icon={FaBurn}>
      <HStack>
        <Text {...textStyle}>Rewards</Text>
        <VStack alignItems="right">
          <BigNumberText number={totals.rewards} {...cryptoStyle} />
          <BigNumberText number={totals.rewards} {...usdStyle} />
        </VStack>
      </HStack>

      <Divider />

      <HStack {...rowStyle}>
        <Text {...textStyle}>Burned</Text>
        <VStack alignItems="right">
          <BigNumberText number={totals.burned} {...cryptoStyle} />
          <BigNumberText number={totals.burned} {...usdStyle} />
        </VStack>
      </HStack>
      
      <Divider />

      <HStack {...rowStyle}>
        <Text {...textStyle}>Tips</Text>
        <VStack alignItems="right">
          <BigNumberText number={totals.tips} {...cryptoStyle} />
          <BigNumberText number={totals.tips} {...usdStyle} />
        </VStack>
      </HStack>

      <Divider />

      <HStack {...rowStyle}>
        <Text {...textStyle}>Net Issuance</Text>
        <VStack alignItems="right" justifyContent="right">
          <BigNumberText number={totals.issuance} {...cryptoStyle} />
          <BigNumberText number={totals.issuance} {...usdStyle} />
        </VStack>
      </HStack>

      <Divider />

      <HStack {...rowStyle}>
        <Text {...textStyle}>Net Reduction</Text>
        <HStack display="inline-flex">
          <Text>{totals.netReduction} %</Text>
        </HStack>
      </HStack>
    </Card>
  );
}
