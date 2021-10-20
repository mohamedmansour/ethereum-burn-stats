import { LightMode, HStack, useColorModeValue, Text } from "@chakra-ui/react";
import { utils } from "ethers";
import { TooltipProps, ComposedChart, CartesianGrid, YAxis, XAxis, Bar, Cell, Tooltip } from "recharts";
import { Card } from "../../atoms/Card";
import { CustomResponsiveContainer } from "../../atoms/CustomResponsiveContainer";
import { capitalizeFirstLetter } from "../../utils/strings";
import { ChartData, TimeBucket } from "./HistoricalTypes";

const CustomTooltip = (props: TooltipProps<string, string>) => {
  if (props.active && props.payload && props.payload.length) {
    const payload = props.payload[0] as any
    const item = {
      timestamp: payload.payload.timestamp,
      value: utils.commify(payload.value) + ' ETH',
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
          <HStack>
            <Text variant='brandSecondary' fontWeight="bold">{item.name}:</Text>
            <Text>{item.value}</Text>
          </HStack>
          {item.name === "rewards" && (
            <HStack>
              <Text variant='brandSecondary' fontWeight="bold">Tips:</Text>
              <Text>{item.tips}</Text>
            </HStack>
          )}
        </LightMode>
      </Card>
    )
  }

  return null;
};

export function HistoricalChart({ data, title, tooltip, type, dataKey }: { data: ChartData[], title: string, tooltip: string, type: TimeBucket, dataKey: (keyof ChartData)[] }) {
  const cartesianLineColor = useColorModeValue("red.500", "red.200")

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
        <ComposedChart data={data} stackOffset="sign" margin={{ top: 0, left: 0, right: 0, bottom: 0 }} syncId="1">
          <CartesianGrid strokeDasharray="3 3" stroke={cartesianLineColor} />
          <YAxis type="number" domain={[0, 'auto']} fontSize={10} tickLine={false} tickFormatter={onTickFormat} />
          <XAxis dataKey="timestamp" angle={-30} dy={10} fontSize={10} tickCount={10} height={40} />
          <Bar type="monotone" dataKey={dataKey[0]} stackId="stack" fillOpacity={1} strokeWidth={2} isAnimationActive={false}>
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
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#2a2a2a' }} />
        </ComposedChart>
      </CustomResponsiveContainer>
    </Card>
  )
}
