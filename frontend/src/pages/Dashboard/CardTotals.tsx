
import { useMemo, useState } from 'react';
import { Box, Button, Heading, HStack, Icon, ListItem, Tab, TabList, TabPanel, TabPanels, Tabs, Text, UnorderedList, VStack } from '@chakra-ui/react';
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
import { useSettings } from '../../contexts/SettingsContext';
import { Setting, Tooltips, TotalFilters } from '../../config';
import { useHistory } from 'react-router';

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
      <ListItem>{Tooltips.rewards}</ListItem>
      <ListItem>{Tooltips.burned}</ListItem>
      <ListItem>{Tooltips.tips}</ListItem>
      <ListItem>{Tooltips.netIssuance}</ListItem>
      <ListItem>{Tooltips.netReduction}</ListItem>
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

function HistoricalButton() {
  const history = useHistory()
  return <Button size="xs" variant="outline" onClick={() => history.push("/historical")}>view history</Button>
}

export function CardTotals() {
  const { data: { details: { totals, totalsHour, totalsDay, totalsWeek, totalsMonth, usdPrice } } } = useBlockExplorer();
  const settings = useSettings();
  const filterIndex = useMemo<number>(() => settings.get(Setting.totalFilterIndex), [settings])
  const [subtitle, setSubtitle] = useState(TotalFilters[filterIndex])

  const onChange = (index: number) => {
    settings.set(Setting.totalFilterIndex, index);
    setSubtitle(Object.values(TotalFilters)[index])
  }

  return (
    <Card title="Overview" subtitle={subtitle.title} tooltip={<RenderTooltip />} /*rightSection={<HistoricalButton />}*/>
      <Tabs isFitted variant="inline" defaultIndex={filterIndex} onChange={onChange}>
        <TabList>
          {TotalFilters.map(filter => (
            <Tab key={filter.key}>{filter.key}</Tab>
          ))}
        </TabList>
        <TabPanels>
          <TabPanel>
            <TotalTabPanel totals={totalsHour} amount={usdPrice} />
          </TabPanel>
          <TabPanel>
            <TotalTabPanel totals={totalsDay} amount={usdPrice} />
          </TabPanel>
          <TabPanel>
            <TotalTabPanel totals={totalsWeek} amount={usdPrice} />
          </TabPanel>
          <TabPanel>
            <TotalTabPanel totals={totalsMonth} amount={usdPrice} />
          </TabPanel>
          <TabPanel>
            <TotalTabPanel totals={totals} amount={usdPrice} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Card>
  );
}
