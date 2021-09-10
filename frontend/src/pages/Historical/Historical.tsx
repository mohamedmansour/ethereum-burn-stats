import { Tab, TabList, TabPanel, TabPanels, Tabs, Text, VStack } from '@chakra-ui/react'
import { utils } from 'ethers'
import { useEffect, useState } from 'react'
import { ComposedChart, YAxis, XAxis, Bar, Tooltip, Cell } from 'recharts'
import { Card } from '../../atoms/Card'
import { CustomResponsiveContainer } from '../../atoms/CustomResponsiveContainer'
import { Tooltips } from '../../config'
import { useEthereum } from '../../contexts/EthereumContext'
import { TotalsWithId } from '../../libs/ethereum'

interface ChartData {
  timestamp: string
  burned: number
  issuance: number
  rewards: number
  tips: number
  netReduction: number
}

type TimeBucket = 'hour' | 'day' | 'month'

interface ChartDataBucket {
  type: TimeBucket
  data: ChartData[]
}

interface ChartRange {
  hour: ChartDataBucket
  day: ChartDataBucket,
  month: ChartDataBucket
}

function TotalChart({data, title, tooltip, type, dataKey}: {data: ChartData[], title: string, tooltip: string, type: TimeBucket, dataKey: (keyof ChartData)[]}) {
  const onTickFormat = (value: any, index: number) => {
    const realNumber = Number(value);
    if (!realNumber) {
      return "ETH"
    }
    return utils.commify(realNumber)
  }

  return (
    <Card title={`${title} per ${type}`} h="300px" w="100%" tooltip={tooltip} position="relative">
      <CustomResponsiveContainer>
        <ComposedChart data={data} stackOffset="sign" margin={{ top: 0, left: 0, right: 0, bottom: 0 }}>
          <YAxis type="number" domain={[0, 'auto']} fontSize={10} tickLine={false} tickFormatter={onTickFormat} />
          <XAxis dataKey="timestamp" angle={-30} dy={10} fontSize={10} tickCount={10} height={40} />
          <Bar type="monotone" stackId="stack" dataKey={dataKey[0]} fill="#FF7B24" isAnimationActive={false}>
              {data.map((entry, index) => {
              const isNegative = entry[dataKey[0]] < 0;
              return (
                <Cell key={`cell-${index}`} fill={isNegative ? "#FFC40C" : "#FF7B24"} />
              )
            })}
          </Bar>
          {dataKey.length > 1 && (
            <Bar type="monotone" stackId="stack" dataKey={dataKey[1]} fill="#FFC40C" isAnimationActive={false} />
          )}
          <Tooltip />
        </ComposedChart>
      </CustomResponsiveContainer>
    </Card>
  )
}

function TotalTabPanel({ bucket }: { bucket: ChartDataBucket }) {
  const { data, type } = bucket
  return (
    <VStack gridGap={4} mt={8} align="flex-start">
      <Text>Displaying the last {data.length} {type}s</Text>
        <TotalChart
          title="Burned" 
          dataKey={["burned"]}
          tooltip={Tooltips.burned}
          type={type}
          data={data} />
        <TotalChart 
          title="Rewards and Tips" 
          dataKey={["rewards", "tips"]} 
          tooltip={`${Tooltips.rewards} ${Tooltips.tips}`}
          type={type} 
          data={data} />
        <TotalChart
          title="Net Issuance" 
          dataKey={["issuance"]} 
          tooltip={Tooltips.netIssuance} 
          type={type} 
          data={data} />
        <TotalChart 
          title="Net Reduction" 
          dataKey={["netReduction"]} 
          tooltip={Tooltips.netReduction}
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
        hour: { type: "hour", data: formatToChartData(response.totalsPerHour, 'hour').slice(0, 72).reverse() },
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
      <TabList>
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
