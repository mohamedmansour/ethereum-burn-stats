import { Tab, TabList, TabPanel, TabPanels, Tabs, Text, VStack } from '@chakra-ui/react'
import { utils } from 'ethers'
import { useEffect, useState } from 'react'
import { Tooltips } from '../../config'
import { useEthereum } from '../../contexts/EthereumContext'
import { TotalsWithId } from '../../libs/ethereum'
import { HistoricalChart } from './HistoricalChart'
import { ChartData, ChartDataBucket, TimeBucket } from './HistoricalTypes'

interface ChartRange {
  hour: ChartDataBucket
  day: ChartDataBucket,
  month: ChartDataBucket
}


function TotalTabPanel({ bucket }: { bucket: ChartDataBucket }) {
  const { data, type } = bucket
  return (
    <VStack gridGap={4} mt={8} align="flex-start">
      <Text>Displaying the last {data.length} {type}s</Text>
      <HistoricalChart
        title="Burned"
        dataKey={["burned"]}
        tooltip={Tooltips.burned}
        type={type}
        data={data} />
      <HistoricalChart
        title="Rewards and Tips"
        dataKey={["rewards", "tips"]}
        tooltip={`${Tooltips.rewards} ${Tooltips.tips}`}
        type={type}
        data={data} />
      <HistoricalChart
        title="Net Issuance"
        dataKey={["issuance"]}
        tooltip={Tooltips.netIssuance}
        type={type}
        data={data} />
    </VStack>
  )
}

export function Historical() {
  const ethereum = useEthereum()
  const [data, setData] = useState<ChartRange>()
  useEffect(() => {
    if (!ethereum.eth) {
      return
    }

    const init = async () => {
      const response = await ethereum.eth!.getInitialAggregatesData()
      const formatTimestampToDateString = (id: string, bucket: TimeBucket) => {
        const startTime = id.split(':')
        const date = new Date(parseInt(startTime[0]) * 1000)

        switch (bucket) {
          case 'hour':
            return new Intl.DateTimeFormat(navigator.language, {
              hour: 'numeric',
              day: 'numeric',
              month: 'short'
            }).format(date)
          case 'day':
            return new Intl.DateTimeFormat(navigator.language, {
              day: 'numeric',
              month: 'short'
            }).format(date)
          case 'month':
            return new Intl.DateTimeFormat(navigator.language, {
              month: 'long'
            }).format(date)
        }
      }

      const formatToChartData = (totals: TotalsWithId[], bucket: TimeBucket) => totals.map<ChartData>(total => (
        {
          timestamp: formatTimestampToDateString(total.id, bucket),
          burned: parseFloat(utils.formatUnits(total.burned, 'ether')),
          issuance: parseFloat(utils.formatUnits(total.issuance, 'ether')),
          rewards: parseFloat(utils.formatUnits(total.rewards, 'ether')),
          tips: parseFloat(utils.formatUnits(total.tips, 'ether')),
          netReduction: total.netReduction,
        }
      ))

      setData({
        hour: { type: "hour", data: formatToChartData(response.totalsPerHour, 'hour').reverse() },
        day: { type: "day", data: formatToChartData(response.totalsPerDay, 'day').reverse() },
        month: { type: "month", data: formatToChartData(response.totalsPerMonth, 'month').reverse() },
      });
    }

    init()
  }, [ethereum])

  if (!data) {
    return null
  }

  return (
    <Tabs variant="inline" isLazy>
      <TabList display="inline-flex">
        <Tab>Hour</Tab>
        <Tab>Day</Tab>
        <Tab>Month</Tab>
      </TabList>
      <TabPanels>
        <TabPanel><TotalTabPanel bucket={data.hour} /></TabPanel>
        <TabPanel><TotalTabPanel bucket={data.day} /></TabPanel>
        <TabPanel><TotalTabPanel bucket={data.month} /></TabPanel>
      </TabPanels>
    </Tabs>
  )
}
