import { Flex, Tab, TabList, TabPanel, TabPanels, Tabs, Text, VStack } from '@chakra-ui/react'
import { utils } from 'ethers'
import { useEffect, useMemo, useState } from 'react'
import { Setting, Tooltips } from '../../config'
import { useEthereum } from '../../contexts/EthereumContext'
import { useSettings } from '../../contexts/SettingsContext'
import { layoutConfig } from '../../layoutConfig'
import { Percentiles, TotalsWithId } from '../../libs/ethereum'
import { HistoricalChart } from './HistoricalChart'
import { ChartData, ChartDataBucket, TimeBucket } from './HistoricalTypes'

interface ChartRange {
  hour: ChartDataBucket
  day: ChartDataBucket,
  month: ChartDataBucket
}


function TotalTabPanel({ bucket }: { bucket: ChartDataBucket | undefined }) {
  return (
    <VStack spacing={0} gridGap={layoutConfig.gap} mt={8} align="flex-start">
      <HistoricalChart
        title="BaseFee"
        dataKey={["baseFee"]}
        percentilesKey="baseFeePercentiles"
        tooltip={Tooltips.baseFeeInsights}
        bucket={bucket} />
      <HistoricalChart
        title="Burned"
        dataKey={["burned"]}
        tooltip={Tooltips.burned}
        bucket={bucket} />
      <HistoricalChart
        title="Net Issuance"
        dataKey={["issuance"]}
        tooltip={Tooltips.netIssuance}
        bucket={bucket} />
      <HistoricalChart
        title="Rewards and Tips"
        dataKey={["rewards", "tips"]}
        tooltip={`${Tooltips.rewards} ${Tooltips.tips}`}
        bucket={bucket} />
    </VStack>
  )
}

function TabTitle({ data, index }: { data: ChartRange | undefined, index: number }) {
  let title: string
  if (!data) {
    title = "Rendering... please wait!"
  } else {
    let type = index === 0 ? data.hour.type : index === 1 ? data.day.type : data.month.type
    let length = (index === 0 ? data.hour.data : index === 1 ? data.day.data : data.month.data).length
    title = `Displaying the last ${length} ${type}s of data in UTC`
  }
  

  return (
    <Text flex={1} pr={4} textAlign="right" variant="brandSecondary">
      {title}
    </Text>
  )
}

export function Historical() {
  const settings = useSettings();
  const ethereum = useEthereum()
  const [data, setData] = useState<ChartRange>()
  const initialBucketIndex = useMemo(() => { return settings.get(Setting.insightBucket) }, [settings])
  const [bucketIndex, setBucketIndex] = useState(initialBucketIndex)

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
              month: 'short',
              timeZone: 'UTC',
            }).format(date)
          case 'day':
            return new Intl.DateTimeFormat(navigator.language, {
              day: 'numeric',
              month: 'short',
              timeZone: 'UTC',
            }).format(date)
          case 'month':
            return new Intl.DateTimeFormat(navigator.language, {
              month: 'long',
              timeZone: 'UTC',
            }).format(date)
        }
      }

      // Since the chart software adds all the stacked bars, it really doesn't make
      // sense since we are not getting the total of base fee, so for the ones we are
      // rendering, just subract it so the number shows the maximum base fee.
      const normalizePercentiles = (percentiles: Percentiles): Percentiles => {
        return {
          Minimum: percentiles.Minimum,
          Median: percentiles.Median - percentiles.Minimum,
          Maximum: percentiles.Maximum,
          ninetieth: percentiles.ninetieth - percentiles.Median,
        }
      }

      const formatToChartData = (totals: TotalsWithId[], bucket: TimeBucket) => totals.map<ChartData>(total => (
        {
          timestamp: formatTimestampToDateString(total.id, bucket),
          baseFee: total.baseFee,
          baseFeePercentiles: normalizePercentiles(total.baseFeePercentiles),
          burned: parseFloat(utils.formatUnits(total.burned, 'ether')),
          issuance: parseFloat(utils.formatUnits(total.issuance, 'ether')),
          rewards: parseFloat(utils.formatUnits(total.rewards, 'ether')),
          tips: parseFloat(utils.formatUnits(total.tips, 'ether')),
          netReduction: total.netReduction,
        }
      ))

      const mutatedData: ChartRange = {
        hour: { type: "hour", data: formatToChartData(response.totalsPerHour, 'hour').reverse() },
        day: { type: "day", data: formatToChartData(response.totalsPerDay, 'day').reverse() },
        month: { type: "month", data: formatToChartData(response.totalsPerMonth, 'month').reverse() },
      }

      setData(mutatedData)
    }

    init()
  }, [initialBucketIndex, ethereum])

  const onTabChange = (index: number) => {
    if (!data)
      return
    setBucketIndex(index)
    settings.set(Setting.insightBucket, index)
  }

  return (
    <Tabs defaultIndex={initialBucketIndex} variant="inline" isLazy onChange={(index) => onTabChange(index)}>
      <Flex direction={layoutConfig.flexRow} align="center">
        <TabTitle data={data} index={bucketIndex} />
        <TabList>
          <Tab>Hour</Tab>
          <Tab>Day</Tab>
          <Tab>Month</Tab>
        </TabList>
      </Flex>
      <TabPanels>
        <TabPanel><TotalTabPanel bucket={data && data.hour} /></TabPanel>
        <TabPanel><TotalTabPanel bucket={data && data.day} /></TabPanel>
        <TabPanel><TotalTabPanel bucket={data && data.month} /></TabPanel>
      </TabPanels>
    </Tabs>
  )
}
