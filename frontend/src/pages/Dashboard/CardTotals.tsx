import { Heading, HStack, Icon, ListItem, Text, UnorderedList, VStack } from '@chakra-ui/react';
import { BigNumber } from 'ethers';
import { IconType } from 'react-icons';
import { FaBurn, FaMoneyBillWave } from 'react-icons/fa';
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
          <BigNumberText number={value} valueStyle={{fontSize: "md", fontWeight: "bold"}} maximumFractionDigits={-1} />
          <BigNumberText number={value} valueStyle={{fontSize: "xs", fontWeight: "medium"}} maximumFractionDigits={-1} usdConversion={amount} />
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

function RenderTooltip() {
  return (<>
    <Heading size="xs">Overview explainer</Heading>
    <UnorderedList mt={4} spacing={2}>
      <ListItem>Rewards is newly minted ethereum: block reward + uncle rewards + uncle inclusion rewards.</ListItem>
      <ListItem>Burned is the block's <code>gas used x base fee</code>.</ListItem>
      <ListItem>Tips is the sum of all tips given from all transactions in the block. Tips are optional.</ListItem>
      <ListItem>Net Issuance is just <code>burned - rewards</code>. The amount of new ETH coming into circulation.</ListItem>
      <ListItem>Net Reduction explains how much ETH issuance was reduced after EIP-1559, when this reaches above 100%, it means we are burning more than issuing. Ultra sound money!</ListItem>
    </UnorderedList>
  </>)
}

export function CardTotals() {
  const { data: { details: { totals, usdPrice } } } = useBlockExplorer();
  const amount = usdPrice

  return (
    <Card title="Overview" subtitle="Total stats since EIP-1559" tooltip={<RenderTooltip />}>
      <TotalStatLine icon={IoTrophySharp} title="Rewards" value={totals.rewards} amount={amount} />
      <TotalStatLine icon={FaBurn} title="Burned" value={totals.burned} amount={amount} />
      <TotalStatLine icon={FaMoneyBillWave} title="Tips" value={totals.tips} amount={amount} />
      <TotalStatLine icon={BiLineChart} title="Net Issuance" value={totals.issuance} amount={amount} />
      <TotalStatLine icon={AiFillPieChart} title="Net Reduction" amount={totals.netReduction} />
    </Card>
  );
}
