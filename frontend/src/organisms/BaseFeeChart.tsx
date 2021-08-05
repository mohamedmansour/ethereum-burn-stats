import { Box, FlexOptions, forwardRef, HStack, HTMLChakraProps, Text } from "@chakra-ui/react";
import { BigNumber, utils } from "ethers";
import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, TooltipProps, Legend, Area, AreaChart } from 'recharts';
import { BlockStats } from "../contexts/EthereumContext";
import { BigNumberFormat, BigNumberText } from "./BigNumberText";

interface BaseFeeChartProps extends HTMLChakraProps<"div">, FlexOptions {
  data: BlockStats[]
  chartType: ChartType
}

export type ChartType = "tips & burned" | "basefee" | "transactions"

function CustomTooltip(props: TooltipProps<string, string>) {
  if (props.active && props.payload && props.payload.length) {
    const payload = props.payload[0].payload as BlockStats
    return (
      <Box bg="brand.subheader" p="4" rounded="lg" fontSize={12}>
        <HStack><Text color="brand.secondaryText" fontWeight="bold">Block:</Text><Text>{payload.number}</Text></HStack>
        <HStack><Text color="brand.secondaryText" fontWeight="bold">Burned:</Text><BigNumberText number={payload.burned} /></HStack>
        <HStack><Text color="brand.secondaryText" fontWeight="bold">Rewards:</Text><BigNumberText number={payload.rewards} /></HStack>
        <HStack><Text color="brand.secondaryText" fontWeight="bold">Tips:</Text><BigNumberText number={payload.tips} /></HStack>
        <HStack><Text color="brand.secondaryText" fontWeight="bold">Basefee:</Text><BigNumberText number={payload.baseFee} /></HStack>
        <HStack><Text color="brand.secondaryText" fontWeight="bold">Txs:</Text><Text>{payload.transactions}</Text></HStack>
      </Box>
    );
  }

  return null;
};

const chartToTypeMapping = {
  "tips & burned": 'tipsFormatted',
  basefee: 'baseFeeFormatted',
  transactions: 'transactions'
}

interface ChartData {
  points: any[]
  chartType: ChartType
}

export const BaseFeeChart = forwardRef<BaseFeeChartProps, 'div'>((props: BaseFeeChartProps, ref: React.ForwardedRef<any>) => {
  const [data, setData] = useState<ChartData>()

  useEffect(() => {
    const newData = []

    for (let i = props.data.length - 1; i >= 0; i--) {
      const block = props.data[i]
      const chartData: { [key: string]: any } = {
        index: i,
        ...block,
      }

      switch (props.chartType) {
        case "tips & burned":
          chartData.tipsFormatted = utils.formatUnits(block.tips, 'ether')
          chartData.burnedFormatted = utils.formatUnits(block.burned, 'ether')
          break;
        case "basefee":
          chartData.baseFeeFormatted = utils.formatUnits(block.baseFee, 'gwei')
          break;
      }

      newData.push(chartData)
    }
    setData({
      points: newData,
      chartType: props.chartType
    })
  }, [props.data, props.chartType])

  const onTickFormat = (value: any, index: number) => {
    switch (props.chartType) {
      case "basefee": {
        const formatter = BigNumberFormat({
          number: BigNumber.from((Number(value) * 1000000000).toFixed(0))
        })
        return formatter.prettyValue + ' ' + formatter.currency
      }
      case "tips & burned": {
        const formatter = BigNumberFormat({
          number: BigNumber.from((Number(value) * 1000000000000000000).toFixed(0))
        })
        return formatter.prettyValue + ' ' + formatter.currency
      }
    }
    return value
  }

  if (!data) {
    return null;
  }

  if (props.chartType === "tips & burned") {
    return (
      <Box flex="1" w="99%" overflow="hidden">
        <ResponsiveContainer>
          <AreaChart data={data.points} margin={{ bottom: 20, right: 10, top: 10 }}>
            <YAxis fontSize={10} tickLine={false} tickFormatter={onTickFormat} />
            <XAxis dataKey="block" hide fontSize={10} />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={36} />
            <Area type="monotone" name="tips" dataKey="tipsFormatted" stackId="1" stroke="#E39764" fill="#FFA970" />
            <Area type="monotone" name="burned" dataKey="burnedFormatted" stackId="1" stroke="#E06F24" fill="#FF7B24" />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    )
  }

  return (
    <Box flex="1" w="99%" overflow="hidden">
      <ResponsiveContainer>
        <LineChart data={data.points} margin={{ bottom: 20, right: 10, top: 10 }}>
          <YAxis yAxisId="left" type="number" domain={[0, 'auto']} fontSize={10} tickLine={false} tickFormatter={onTickFormat} />
          <XAxis hide dataKey="block" angle={30} dx={20} dy={10} fontSize={10} />
          <Tooltip content={<CustomTooltip />} />
          <Line yAxisId="left" type="monotone" dataKey={chartToTypeMapping[data.chartType]} stroke="#FF7B24" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  )
})
