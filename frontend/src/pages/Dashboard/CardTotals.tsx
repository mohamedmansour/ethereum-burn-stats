import { HStack, Icon, Text, VStack } from '@chakra-ui/react';
import { BigNumber } from 'ethers';
import { IconType } from 'react-icons';
import { FaMoneyBillWave } from 'react-icons/fa';
import { BiLineChart } from 'react-icons/bi';
import { AiFillPieChart } from 'react-icons/ai';
import { IoTrophySharp } from 'react-icons/io5';
import { Card } from "../../atoms/Card";
import { BigNumberText } from "../../organisms/BigNumberText";
import { useBlockExplorer } from '../../contexts/BlockExplorerContext';

function TotalStatLine({ icon, title, value, amount }: { icon: IconType, title: string, value?: BigNumber, amount: number }) {
  return (
    <HStack alignItems="start" justifyContent="start" pt="6px" pb="6px">
      <HStack justifyContent="center">
        <Icon as={icon} color="#FAB951" />
        <Text flex={1} mr={8} fontSize="md" fontWeight="medium">{title}</Text>
      </HStack>
      {value !== undefined && (
        <VStack align="flex-end" flex={1} spacing={0}>
          <BigNumberText number={value} fontSize="md" textAlign="right" maximumFractionDigits={-1} />
          <BigNumberText number={value} fontSize="xs" textAlign="right" maximumFractionDigits={-1} usdConversion={amount} />
        </VStack>
      )}
      {value === undefined && (
        <HStack justify="flex-end" flex={1} spacing={0}>
          <Text fontSize="md" fontWeight="bold" mr={2}>{amount}</Text>
          <Text fontSize="xs" fontWeight="light" variant="brandSecondary" width="20px">%</Text>
        </HStack>
      )}
    </HStack>
  )
}

export function CardTotals() {
  const { data: { details: { totals, usdPrice } } } = useBlockExplorer();
  const amount = usdPrice

  return (
    <Card title="Overview" subtitle="Total stats since EIP-1559">
      <TotalStatLine icon={IoTrophySharp} title="Rewards" value={totals.rewards} amount={amount} />
      <TotalStatLine icon={AiFillPieChart} title="Burned" value={totals.burned} amount={amount} />
      <TotalStatLine icon={FaMoneyBillWave} title="Tips" value={totals.tips} amount={amount} />
      <TotalStatLine icon={BiLineChart} title="Net Issuance" value={totals.issuance} amount={amount} />
      <TotalStatLine icon={AiFillPieChart} title="Net Reduction" amount={totals.netReduction} />
    </Card>
  );
}
