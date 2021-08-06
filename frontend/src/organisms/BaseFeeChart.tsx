import { Box, FlexOptions, forwardRef, HStack, HTMLChakraProps, Text } from "@chakra-ui/react";
import { BigNumber, utils } from "ethers";
import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, TooltipProps, Legend, Area, AreaChart } from 'recharts';
import { BlockStats } from "../contexts/EthereumContext";
import { Zero } from "../utils/number";
import { BigNumberFormat, BigNumberText } from "./BigNumberText";

interface BaseFeeChartProps extends HTMLChakraProps<"div">, FlexOptions {
  data: BlockStats[]
  chartType: ChartType
}

export type ChartType = "tips & burned" | "basefee" | "transactions" | "gas"

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
        <HStack><Text color="brand.secondaryText" fontWeight="bold">Gas Used:</Text><BigNumberText number={payload.gasUsed} forced="wei" /></HStack>
        <HStack><Text color="brand.secondaryText" fontWeight="bold">Gas Target:</Text><BigNumberText number={payload.gasTarget} forced="wei" /></HStack>
        <HStack><Text color="brand.secondaryText" fontWeight="bold">Txs:</Text><Text>{payload.transactions}</Text></HStack>
      </Box>
    );
  }

  return null;
};

const chartTypeMapping = {
  "tips & burned": {
    primary: {
      dataKey: 'tipsFormatted',
      name: 'tips'
    },
    secondary: {
      dataKey: 'burnedFormatted',
      name: 'burned'
    },
  },
  basefee: {
    primary: {
      dataKey: 'baseFeeFormatted',
      name: 'basefee'
    },
    secondary: {
      dataKey: 'baseFeeFormatted',
      name: 'basefee'
    },
  },
  transactions: {
    primary: {
      dataKey: 'transactions',
      name: 'transactions'
    },
    secondary: {
      dataKey: 'transactions',
      name: 'transactions'
    },
  },
  gas: {
    primary: {
      dataKey: 'gasUsedFormatted',
      name: 'gas used'
    },
    secondary: {
      dataKey: 'gasTargetFormatted',
      name: 'gas target'
    },
  },
}

interface ChartData {
  points: any[]
  chartType: ChartType
}

const maxItemsInChart = 30;

export const BaseFeeChart = forwardRef<BaseFeeChartProps, 'div'>((props: BaseFeeChartProps, ref: React.ForwardedRef<any>) => {
  const [data, setData] = useState<ChartData>()

  useEffect(() => {
    const newData = new Array(maxItemsInChart);
    newData.fill({
      tipsFormatted: 0,
      tips: Zero(),
      burnedFormatted: 0,
      burned: Zero(),
      baseFeeFormatted: 0,
      baseFee: Zero(),
      gasUsedFormatted: 0,
      gasUsed: Zero(),
      gasTargetFormatted: 0,
      gasTarget: Zero(),
    })

    // Fill up the data for the last |maxItemsInChart| blocks,
    const minBounds = props.data.length > newData.length ? 0 : newData.length - props.data.length;
    for (var i = newData.length - 1; i >= minBounds; i--)  {
      const block = props.data[i - minBounds]
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
        case "gas":
          chartData.gasUsedFormatted = block.gasUsed.toNumber()
          chartData.gasTargetFormatted = block.gasTarget.toNumber()
          break;
      }

      newData[i] = chartData
    }

    setData({
      points: newData,
      chartType: props.chartType
    })
  }, [props.data, props.chartType])

  const onTickFormat = (value: any, index: number) => {
    switch (props.chartType) {
      case "basefee": {
        const realNumber = Number(value);
        if (realNumber === -Infinity || realNumber === Infinity || realNumber === 0) {
          return "0 WEI"
        }
        const formatter = BigNumberFormat({
          number: BigNumber.from((realNumber * 1000000000).toFixed(0))
        })
        return formatter.prettyValue + ' ' + formatter.currency
      }
      case "tips & burned": {
        const realNumber = Number(value);
        if (realNumber === -Infinity || realNumber === Infinity || realNumber === 0) {
          return "0 WEI"
        }
        const formatter = BigNumberFormat({
          number: utils.parseEther(realNumber.toString())
        })
        return formatter.prettyValue + ' ' + formatter.currency
      }
      case "gas": {
        return utils.commify(Number(value))
      }
    }
    return value
  }

  if (!data) {
    return null;
  }

  const typeMapping = chartTypeMapping[data.chartType]

  if (props.chartType === "tips & burned" || props.chartType === "gas") {
    return (
      <Box flex="1" w="99%" overflow="hidden">
        <ResponsiveContainer>
          <AreaChart data={data.points} margin={{ bottom: 20, right: 10, top: 10 }}>
            <YAxis fontSize={10} tickLine={false} tickFormatter={onTickFormat} />
            <XAxis dataKey="block" hide fontSize={10} />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={36} wrapperStyle={{fontSize: "10px"}} />
            <Area type="monotone" name={typeMapping.primary.name} dataKey={typeMapping.primary.dataKey} stackId="1" stroke="#E39764" fill="#FFA970"  isAnimationActive={false} />
            <Area type="monotone" name={typeMapping.secondary.name} dataKey={typeMapping.secondary.dataKey} stackId="1" stroke="#E06F24" fill="#FF7B24"  isAnimationActive={false} />
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
          <XAxis hide dataKey="block" angle={30} dx={20} dy={10} fontSize={10} tickCount={10}/>
          <Tooltip content={<CustomTooltip />} />
          <Line yAxisId="left" type="monotone" dataKey={typeMapping.primary.dataKey} stroke="#FF7B24" strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  )
})
