
import { useState } from 'react';
import { Box, Heading, HStack, Icon, ListItem, Tab, TabList, TabListProps, TabPanel, TabPanels, Tabs, Text, UnorderedList, useColorMode, VStack } from '@chakra-ui/react';
import { BigNumber } from 'ethers';
import { FaMoneyBillWave } from 'react-icons/fa';
import { BiLineChart } from 'react-icons/bi';
import { AiFillPieChart } from 'react-icons/ai';
import { IoTrophySharp } from 'react-icons/io5';
import { Card } from "../../atoms/Card";
import { BigNumberText } from "../../organisms/BigNumberText";
import { useBlockExplorer } from '../../contexts/BlockExplorerContext';
import { LogoIcon } from '../../atoms/LogoIcon';
import { Totals } from '../../libs/ethereum';

function TotalStatLine({ icon, title, value, amount }: { icon: any, title: string, value?: BigNumber, amount: number }) {
  return (
    <HStack alignItems="start" justifyContent="start" pt="6px" pb="6px">
      <HStack justifyContent="center">
        <Icon color="#FAB951" as={icon} />
        <Text flex={1} mr={8} fontSize="md" fontWeight="medium">{title}</Text>
      </HStack>
      {value !== undefined && (
        <VStack align="flex-end" flex={1} spacing={0}>
          <BigNumberText number={value} valueStyle={{ fontSize: "md", fontWeight: "bold" }} maximumFractionDigits={-1} />
          <BigNumberText number={value} valueStyle={{ fontSize: "xs", fontWeight: "medium" }} maximumFractionDigits={-1} usdConversion={amount} />
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
    <Heading size="xs" fontWeight="bold">Overview explainer</Heading>
    <UnorderedList mt={4} spacing={2}>
      <ListItem>Rewards is newly minted ethereum: block reward + uncle rewards + uncle inclusion rewards.</ListItem>
      <ListItem>Burned is the block's <code>gas used x base fee</code>.</ListItem>
      <ListItem>Tips is the sum of all tips given from all transactions in the block. Tips are optional.</ListItem>
      <ListItem>Net Issuance is just <code>burned - rewards</code>. The amount of new ETH coming into circulation.</ListItem>
      <ListItem>Net Reduction explains how much ETH issuance was reduced after EIP-1559, when this reaches above 100%, it means we are burning more than issuing. Ultra sound money!</ListItem>
    </UnorderedList>
  </>)
}

function TotalTabPanel({ totals, amount }: { totals: Totals, amount: number }) {
  return (
    <Box pt={4}>
      <TotalStatLine icon={LogoIcon} title="Burned" value={totals.burned} amount={amount} />
      <TotalStatLine icon={IoTrophySharp} title="Rewards" value={totals.rewards} amount={amount} />
      <TotalStatLine icon={FaMoneyBillWave} title="Tips" value={totals.tips} amount={amount} />
      <TotalStatLine icon={BiLineChart} title="Net Issuance" value={totals.issuance} amount={amount} />
      <TotalStatLine icon={AiFillPieChart} title="Net Reduction" amount={totals.netReduction} />
    </Box>
  )
}

const filters = {
  Day: {
    key: '1D',
    title: 'Total stats since yesterday'
  },
  Week: {
    key: '7D',
    title: 'Total stats since last week'
  },
  Month: {
    key: '1M',
    title: 'Total stats since last month'
    
  },
  All: {
    key: 'All',
    title: 'Total stats since EIP-1559'
  }
}

export function CardTotals() {
  const { data: { details: { totals, totalsDay, totalsWeek, totalsMonth, usdPrice } } } = useBlockExplorer();
  const [subtitle, setSubtitle] = useState(filters.All)
  const { colorMode } = useColorMode()

  const isDark = colorMode === "dark"

  const tabStyle = {
    fontSize: "xs",
    m: "4px",
    _selected: {
      fontWeight: "bold",
      color: isDark ? "#fff" : "#000",
      bg: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
      borderRadius: "6px"
    }
  }

  const tablistStyle: Partial<TabListProps> = {
    border: isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.1)",
    borderRadius: "6px",
    userSelect: "none"
  }

  const onChange = (index: number) => {
    setSubtitle(Object.values(filters)[index])
  }

  return (
    <Card title="Overview" subtitle={subtitle.title} tooltip={<RenderTooltip />}>
      <Tabs isFitted variant="unstyled" defaultIndex={3} onChange={onChange}>
        <TabList {...tablistStyle}>
          <Tab {...tabStyle}>{filters.Day.key}</Tab>
          <Tab {...tabStyle}>{filters.Week.key}</Tab>
          <Tab {...tabStyle}>{filters.Month.key}</Tab>
          <Tab {...tabStyle}>{filters.All.key}</Tab>
        </TabList>
        <TabPanels>
          <TabPanel p={0}>
            <TotalTabPanel totals={totalsDay} amount={usdPrice} />
          </TabPanel>
          <TabPanel p={0}>
            <TotalTabPanel totals={totalsWeek} amount={usdPrice} />
          </TabPanel>
          <TabPanel p={0}>
            <TotalTabPanel totals={totalsMonth} amount={usdPrice} />
          </TabPanel>
          <TabPanel p={0}>
            <TotalTabPanel totals={totals} amount={usdPrice} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Card>
  );
}
