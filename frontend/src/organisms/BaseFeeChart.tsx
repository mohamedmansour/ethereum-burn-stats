import { Box, HStack, Text } from "@chakra-ui/react";
import { utils } from "ethers";
import React, { useEffect, useState } from "react";
import { Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, TooltipProps, Legend, ComposedChart, Cell } from 'recharts';
import { maxBlocksToRenderInChart, maxBlocksToRenderInChartMobile } from "../config";
import { useBlockExplorer } from "../contexts/BlockExplorerContext";
import { useMobileDetector } from "../contexts/MobileDetectorContext";
import { Zero } from "../utils/number";
import { BigNumberFormat, BigNumberText } from "./BigNumberText";

interface BaseFeeChartProps {
  chartType: ChartType
}

export type ChartType = "tips" | "issuance" | "basefee" | "gas"

const chartTypeMapping = {
  tips: {
    primary: {
      dataKey: 'tipsFormatted',
      name: 'tips'
    },
    secondary: {
      dataKey: 'rewardFormatted',
      name: 'reward'
    },
  },
  basefee: {
    primary: {
      dataKey: 'baseFeeFormatted',
      name: 'basefee'
    },
    secondary: null
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
  issuance: {
    primary: {
      dataKey: 'issuanceFormatted',
      name: 'issuance'
    },
    secondary: null
  }
}

interface ChartData {
  points: any[]
  chartType: ChartType
}

function LiveChart(props: BaseFeeChartProps) {
  const { isMobile } = useMobileDetector();
  const { data: {blocks}, getBlockStats } = useBlockExplorer(); 
  const [data, setData] = useState<ChartData>()

  useEffect(() => {
    if (!blocks) {
      return;
    }
    const newData = new Array(isMobile ? maxBlocksToRenderInChartMobile : maxBlocksToRenderInChart);
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
    const minBounds = blocks.length > newData.length ? 0 : newData.length - blocks.length;
    for (var i = newData.length - 1; i >= minBounds; i--)  {
      const block = blocks[blocks.length - (i - minBounds) - 1]
      const chartData: { [key: string]: any } = {
        number: block.number,
        issuance: block.rewards.sub(block.burned)
      }

      switch (props.chartType) {
        case "tips":
          chartData.tipsFormatted = parseFloat(utils.formatUnits(block.tips, 'ether'))
          chartData.rewardFormatted = parseFloat(utils.formatUnits(block.rewards, 'ether'))
          break;
        case "basefee":
          chartData.baseFeeFormatted = parseFloat(utils.formatUnits(block.baseFee, 'gwei'))
          break;
        case "gas":
          chartData.gasUsedFormatted = block.gasUsed.toNumber()
          chartData.gasTargetFormatted = block.gasTarget.toNumber()
          break;
        case "issuance":
          chartData.issuanceFormatted = parseFloat(utils.formatUnits(chartData.issuance, 'ether'))
          break;
      }

      newData[i] = chartData
    }

    setData({
      points: newData,
      chartType: props.chartType
    })
  }, [blocks, props.chartType, isMobile])

  if (!blocks) {
    return null;
  }

  const CustomTooltip = (props: TooltipProps<string, string>) => {
    if (props.active && props.payload && props.payload.length && getBlockStats) {
      const item = props.payload[0]
      const payload = item.payload
      const block = getBlockStats(payload.number);
      if (!block) {
        return null;
      }

      return (
        <Box bg="brand.subheader" p="4" rounded="lg" fontSize={12} opacity={0.95}>
          <HStack><Text color="brand.secondaryText" fontWeight="bold">Block:</Text><Text>{payload.number}</Text></HStack>
          <HStack><Text color="brand.secondaryText" fontWeight="bold">Burned:</Text><BigNumberText number={block.burned} /></HStack>
          <HStack><Text color="brand.secondaryText" fontWeight="bold">Rewards:</Text><BigNumberText number={block.rewards} /></HStack>
          {item.name === "issuance" && <HStack><Text color="brand.secondaryText" fontWeight="bold">Issuance:</Text><BigNumberText number={payload.issuance.abs()} /></HStack>}
          <HStack><Text color="brand.secondaryText" fontWeight="bold">Tips:</Text><BigNumberText number={block.tips} /></HStack>
          <HStack><Text color="brand.secondaryText" fontWeight="bold">Basefee:</Text><BigNumberText number={block.baseFee} /></HStack>
          <HStack><Text color="brand.secondaryText" fontWeight="bold">Txs:</Text><Text>{block.transactions}</Text></HStack>
          {item.name === "gas target" && <HStack><Text color="brand.secondaryText" fontWeight="bold">Gas Used:</Text><BigNumberText number={block.gasUsed} forced="wei" /></HStack>}
        </Box>
      );
    }
  
    return null;
  };

  const onTickFormat = (value: any, index: number) => {
    switch (props.chartType) {
      case "basefee": {
        const realNumber = Number(value);
        if (realNumber === -Infinity || realNumber === Infinity || realNumber === 0) {
          return "0"
        }
        const formatter = BigNumberFormat({
          number: utils.parseUnits(realNumber.toString(), 'gwei')
        })

        return formatter.prettyValue + ' GWEI'
      }
      case "gas": {
        return utils.commify(Number(value))
      }
      case "issuance":
      case "tips": {
        return parseFloat(value) + ' ETH'
      }
    }
  }

  if (!data) {
    return null;
  }

  const typeMapping = chartTypeMapping[data.chartType]
  return (
    <Box flex="1" w="99%" overflow="hidden">
      <ResponsiveContainer>
        <ComposedChart data={data.points} margin={{ bottom: 20, right: 10, top: 10 }} stackOffset="sign">
          <YAxis type="number" domain={[0, 'auto']} fontSize={10} tickLine={false} tickFormatter={onTickFormat}  width={75} />
          <XAxis dataKey="number" angle={-30} dx={50} dy={10} fontSize={10} tickCount={10} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#2a2a2a' }} />
          {typeMapping.secondary && <Legend verticalAlign="top" height={36} wrapperStyle={{fontSize: "10px"}} />}
          <Bar type="monotone"stackId="stack" dataKey={typeMapping.primary.dataKey} fill="#FF7B24" isAnimationActive={false} name={typeMapping.primary.name}>
            {data.points.map((entry, index) => {
              const isNegative = entry[typeMapping.primary.dataKey] < 0;
              return (
                  <Cell key={`cell-${index}`} fill={isNegative? "#FFC40C" : "#FF7B24"} />
              )
            })}
          </Bar>
          {typeMapping.secondary && <Bar type="monotone" stackId="stack" dataKey={typeMapping.secondary.dataKey} fill="#FFC40C" isAnimationActive={false} name={typeMapping.secondary.name}/>}
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
  )
}

export const BaseFeeChart = React.memo(LiveChart)
