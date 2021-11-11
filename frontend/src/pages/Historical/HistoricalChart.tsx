import { LightMode, HStack, useColorModeValue, Text, Box } from "@chakra-ui/react";
import { utils } from "ethers";
import { TooltipProps, ComposedChart, YAxis, XAxis, Bar, Cell, Tooltip, Area } from "recharts";
import { Card } from "../../atoms/Card";
import { CustomResponsiveContainer } from "../../atoms/CustomResponsiveContainer";
import { capitalizeFirstLetter } from "../../utils/strings";
import { ChartData, TimeBucket } from "./HistoricalTypes";

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
              <Text bg='#FFC40C' rounded="md" pl={2} pr={2} fontWeight="bold">Median</Text>
              <Text>{payload.payload.baseFeePercentiles.Maximum} GWEI</Text>
            </HStack>
            <HStack>
              <Text fontWeight="bold" rounded="md" pl={2} pr={2} bg="#FF7B24">Min</Text>
              <Text variant='brandSecondary' fontWeight="bold">/</Text>
              <Text bg="#000" rounded="md" pl={2} pr={2} fontWeight="bold">Max:</Text>
              <Text>{payload.payload.baseFeePercentiles.Minimum} / {" "}
                    {payload.payload.baseFeePercentiles.Median} GWEI</Text>
            </HStack>
            <HStack>
              <Text variant='brandSecondary' fontWeight="bold">10th / 25th:</Text>
              <Text>{payload.payload.baseFeePercentiles.Tenth} / {" "}
                    {payload.payload.baseFeePercentiles.twentyFifth} GWEI</Text>
            </HStack>
            <HStack>
              <Text variant='brandSecondary' fontWeight="bold">75th / 90th:</Text>
              <Text>{payload.payload.baseFeePercentiles.seventyFifth} / {" "}
                    {payload.payload.baseFeePercentiles.ninetieth} GWEI</Text>
            </HStack>
            <HStack>
              <Text variant='brandSecondary' fontWeight="bold">95th / 99th:</Text>
              <Text>{payload.payload.baseFeePercentiles.ninetyFifth} / {" "}
                    {payload.payload.baseFeePercentiles.ninetyNinth} GWEI</Text>
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
              <Text bg="#FF7B24" rounded="md" pl={2} pr={2} fontWeight="bold">Rewards:</Text>
              <Text>{item.value}</Text>
            </HStack>
            <HStack>
              <Text bg="#FFC40C" rounded="md" pl={2} pr={2} fontWeight="bold">Tips:</Text>
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
    data,
    title,
    tooltip,
    type,
    dataKey, 
    percentilesKey
  }: { 
    data: ChartData[], 
    title: string, 
    tooltip: string, 
    type: TimeBucket, 
    dataKey: (keyof ChartData)[], 
    percentilesKey?: keyof ChartData }) {
  const labelColor = useColorModeValue('#a9a9a9', '#A8A8A8')

  const onTickFormat = (value: any, index: number) => {
    const realNumber = Number(value);
    if (!realNumber) {
      if (dataKey[0] === "baseFee")
        return "GWEI"
      return "ETH"
    }
    return utils.commify(realNumber)
  }

  return (
    <Card title={`${title} per ${type}`} h="300px" w="100%" tooltip={tooltip} position="relative">
      <CustomResponsiveContainer>
        <ComposedChart data={data} stackOffset="sign" margin={{ top: 0, left: 0, right: 0, bottom: 0 }} syncId="1">
          
          {!percentilesKey && (
            <YAxis type="number" domain={[0, 'auto']} fontSize={10} tickLine={false} tickFormatter={onTickFormat} yAxisId="left" />
          )}

          <XAxis dataKey="timestamp" angle={-30} dy={10} fontSize={10} tickCount={10} height={40} />

          {!percentilesKey && (
            <>
            <Bar yAxisId="left" type="monotone" dataKey={dataKey[0]} stackId="stack" fillOpacity={1} strokeWidth={2} isAnimationActive={false}>
              {data.map((entry, index) => {
                const isNegative = entry[dataKey[0]] < 0;
                return (
                  <Cell key={`cell-${index}`} fill={isNegative ? "#FFC40C" : "#FF7B24"} />
                )
              })}
            </Bar>
            {dataKey.length > 1 && (
              <Bar yAxisId="left" type="monotone" stackId="stack" dataKey={dataKey[1]} fill="#FFC40C" isAnimationActive={false} />
            )}
          </>
          )}
          
          {percentilesKey && (
            <>
              <YAxis type="number" domain={[0, 'auto']} fontSize={10} tickLine={false} tickFormatter={onTickFormat} yAxisId="left" 
                     label={{ value: 'min / median', angle: -90, position: "insideLeft", fill: labelColor }} />
              <YAxis 
                  type="number" 
                  domain={[0, 'auto']} 
                  fontSize={10} 
                  tickLine={false} 
                  tickFormatter={onTickFormat} 
                  yAxisId="right" 
                  orientation="right" 
                  label={{ value: 'max', angle: 90, position: "insideRight", fill: labelColor }} 
              />
              <Bar yAxisId="left" type="monotone" dataKey={`${percentilesKey}.Minimum`} stroke="#FF7B24" fill="#FF7B24" stackId="percentile" />
              <Bar yAxisId="left" type="monotone" dataKey={`${percentilesKey}.Median`}  stroke="#FFC40C" fill="#FFC40C" stackId="percentile" />
              <Area yAxisId="right" type="monotone" dataKey={`${percentilesKey}.Maximum`} stroke="#000" strokeWidth={3} fill="rgba(0,0,0,0.3)" dot={false} />
            </>
          )}
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#2a2a2a' }} />
        </ComposedChart>
      </CustomResponsiveContainer>
    </Card>
  )
}
