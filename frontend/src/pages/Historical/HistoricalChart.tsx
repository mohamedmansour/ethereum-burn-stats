import { LightMode, HStack, Text, Box, Center, Spinner } from "@chakra-ui/react";
import { utils } from "ethers";
import { TooltipProps, ComposedChart, YAxis, XAxis, Bar, Cell, Tooltip, Legend } from "recharts";
import { ContentType, Props } from "recharts/types/component/DefaultLegendContent";
import { Card } from "../../atoms/Card";
import { CustomResponsiveContainer } from "../../atoms/CustomResponsiveContainer";
import { capitalizeFirstLetter } from "../../utils/strings";
import { ChartData, ChartDataBucket } from "./HistoricalTypes";

const CustomTooltip = (props: TooltipProps<string, string>) => {
  if (props.active && props.payload && props.payload.length) {
    const payload = props.payload[0] as any
    const item = {
      timestamp: payload.payload.timestamp,
      value: utils.commify(payload.value) + (payload.dataKey === "baseFee" ? " GWEI" : " ETH"),
      name: capitalizeFirstLetter(payload.name),
      tips: utils.commify(payload.payload.tips) + ' ETH',
    }

    return (
      <Card variant="popup">
        <LightMode>
          <HStack>
            <Text variant='brandSecondary' fontWeight="bold">Date:</Text>
            <Text>{item.timestamp}</Text>
          </HStack>

          {item.name === "BaseFeePercentiles.Minimum" && (
            <>
              <HStack>
                <Box w={4} h={4} bg="#FF7B24" rounded="full" />
                <Text variant='brandSecondary' fontWeight="bold">Min:</Text>
                <Text>{payload.payload.baseFeePercentiles.Minimum} GWEI</Text>
              </HStack>
              <HStack>
                <Box w={4} h={4} bg="#FFC40C" rounded="full" />
                <Text variant='brandSecondary' fontWeight="bold">Median:</Text>
                <Text>{payload.payload.baseFeePercentiles.Median} GWEI</Text>
              </HStack>
              <HStack>
                <Box w={4} h={4} bg="#d43532" rounded="full" />
                <Text variant='brandSecondary' fontWeight="bold">90p / Max:</Text>
                <Text>{payload.payload.baseFeePercentiles.ninetieth} / {payload.payload.baseFeePercentiles.Maximum} GWEI</Text>
              </HStack>
            </>
          )}
          {item.name !== "BaseFeePercentiles.Minimum" && item.name !== "Rewards" && (
            <HStack>
              <Text variant='brandSecondary' fontWeight="bold">{item.name}:</Text>
              <Text>{item.value}</Text>
            </HStack>
          )}
          {item.name === "Rewards" && (
            <>
              <HStack>
                <Box w={4} h={4} bg="#FF7B24" rounded="full" />
                <Text variant='brandSecondary' fontWeight="bold">Rewards:</Text>
                <Text>{item.value}</Text>
              </HStack>
              <HStack>
                <Box w={4} h={4} bg="#FFC40C" rounded="full" />
                <Text variant='brandSecondary' fontWeight="bold">Tips:</Text>
                <Text>{item.tips}</Text>
              </HStack>
            </>
          )}
        </LightMode>
      </Card>
    )
  }

  return null;
}

export function HistoricalChart({
  bucket,
  title,
  tooltip,
  dataKey,
  percentilesKey
}: {
  bucket: ChartDataBucket | undefined,
  title: string,
  tooltip: string,
  dataKey: (keyof ChartData)[],
  percentilesKey?: keyof ChartData
}) {

  if (!bucket) {
    return (
      <Card title={`${title} per hour`} height="300px" width="100%" >
        <Center h="100%"><Spinner /></Center>
      </Card>
    )
  }
  
  const { data, type } = bucket

  const onTickFormat = (value: any, index: number) => {
    const realNumber = Number(value);
    if (!realNumber) {
      if (dataKey[0] === "baseFee")
        return "GWEI"
      return "ETH"
    }
    return utils.commify(realNumber)
  }

  const formatLegendName = (value: string) => {
    if (value === "baseFeePercentiles.Minimum") return "min"
    if (value === "baseFeePercentiles.Median") return "median"
    if (value === "baseFeePercentiles.Maximum") return "max"
    if (value === "baseFeePercentiles.ninetieth") return "90p"
    return value
  }

  const renderLegend = (props: Props): ContentType => {
    const { payload } = props;
    if (!payload)
      return <></>

    return (
      <HStack justify="flex-end" gridGap={4}>
        {
          payload.map((entry) => (
            <HStack key={entry.value}>
              <Box bg={entry.color} w={3} h={3} rounded='full'></Box>
              <Text variant="brandSecondary">{formatLegendName(entry.value)}</Text>
            </HStack>
          ))
        }
      </HStack>
    );
  }
console.log(data)
  return (
    <Card title={`${title} per ${type}`} h="300px" w="100%" tooltip={tooltip} position="relative">
      <CustomResponsiveContainer>
        <ComposedChart data={data} stackOffset="sign" margin={{ top: 0, left: 0, right: 0, bottom: 0 }} syncId="1">

          {!percentilesKey && (
            <YAxis type="number" domain={[0, 'auto']} fontSize={10} tickLine={false} tickFormatter={onTickFormat} />
          )}

          <XAxis dataKey="timestamp" angle={-30} dy={10} fontSize={10} tickCount={10} height={40} />

          {!percentilesKey && (
            <>
              <Bar type="monotone" dataKey={dataKey[0]} stackId="stack" fillOpacity={1} fill="#FF7B24" strokeWidth={2} isAnimationActive={false}>
                {data.map((entry, index) => {
                  const isNegative = entry[dataKey[0]] < 0;
                  return (
                    <Cell key={`cell-${index}`} fill={isNegative ? "#FFC40C" : "#FF7B24"} />
                  )
                })}
              </Bar>
              {dataKey.length > 1 && (
                <>
                  <Legend align="right" verticalAlign="top" content={renderLegend} />
                  <Bar type="monotone" stackId="stack" dataKey={dataKey[1]} fill="#FFC40C" isAnimationActive={false} />
                </>
              )}
            </>
          )}

          {percentilesKey && (
            <>
              <Legend align="right" verticalAlign="top" content={renderLegend} />
              <YAxis type="number" domain={[0, 'auto']} fontSize={10} tickLine={false} tickFormatter={onTickFormat} />
              <Bar type="monotone" dataKey={`${percentilesKey}.Minimum`} stroke="#FF7B24" fill="#FF7B24" stackId="percentile" isAnimationActive={false} />
              <Bar type="monotone" dataKey={`${percentilesKey}.Median`} stroke="#FFC40C" fill="#FFC40C" stackId="percentile" isAnimationActive={false} />
              <Bar type="monotone" dataKey={`${percentilesKey}.ninetieth`} stroke="#d83935" fill="#d83935" stackId="percentile" isAnimationActive={false} />
            </>
          )}
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#2a2a2a' }} />
        </ComposedChart>
      </CustomResponsiveContainer>
    </Card>
  )
}
