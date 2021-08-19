import { Box, HStack, LightMode, Text } from "@chakra-ui/react";
import { BigNumber, utils } from "ethers";
import React, { useEffect, useState } from "react";
import { Bar, XAxis, YAxis, Tooltip, TooltipProps, Legend, ComposedChart, Cell } from 'recharts';
import { maxBlocksToRenderInChart, maxBlocksToRenderInChartMobile } from "../config";
import { useBlockExplorer } from "../contexts/BlockExplorerContext";
import { useMobileDetector } from "../contexts/MobileDetectorContext";
import { Zero } from "../utils/number";
import { BigNumberFormat, BigNumberText } from "./BigNumberText";
import { GasTarget, GasUsed, GasUsedPercent } from "../organisms/GasUsed";
import { CustomResponsiveContainer } from "../atoms/CustomResponsiveContainer";
import { Card } from "../atoms/Card";

interface BaseFeeChartProps {
  chartType: ChartType
}

export type ChartType = "tips" | "issuance" | "basefee" | "gas"

const chartTypeMapping = {
  tips: {
    primary: {
      dataKey: 'rewardFormatted',
      name: 'reward'
    },
    secondary: {
      dataKey: 'tipsFormatted',
      name: 'tips'
    },
  },
  basefee: {
    primary: {
      dataKey: 'baseFeeFormatted',
      name: 'basefee'
    },
    secondary: {
      dataKey: 'priorityFeeFormatted',
      name: 'priorityfee'
    },
  },
  gas: {
    primary: {
      dataKey: 'gasUsedFormatted',
      name: 'gas used'
    },
    secondary: null
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
  const { data: { blocks }, getBlockStats } = useBlockExplorer();
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
      priorityFeeFormatted: 0,
      priorityFee: Zero(),
      gasUsedFormatted: 0,
      gasUsed: Zero()
    })

    // Fill up the data for the last |maxItemsInChart| blocks,
    const minBounds = blocks.length > newData.length ? 0 : newData.length - blocks.length;
    for (var i = newData.length - 1; i >= minBounds; i--) {
      const block = blocks[Math.min(newData.length, blocks.length) - (i - minBounds) - 1]
      const chartData: { [key: string]: any } = {
        number: block.number,
        issuance: block.rewards.sub(block.burned),
        burned: (block.rewards.sub(block.burned).isNegative() ? block.burned.add(block.rewards.sub(block.burned)) : block.burned),
        reduction: block.burned.mul(BigNumber.from(10000)).div(block.rewards).toNumber() / 100
      }

      switch (props.chartType) {
        case "tips":
          chartData.tipsFormatted = parseFloat(utils.formatUnits(block.tips, 'ether'))
          chartData.rewardFormatted = parseFloat(utils.formatUnits(block.rewards, 'ether'))
          break;
        case "basefee":
          chartData.baseFeeFormatted = parseFloat(utils.formatUnits(block.baseFee, 'gwei'))
          chartData.priorityFeeFormatted = parseFloat(utils.formatUnits(block.priorityFee, 'gwei'))
          break;
        case "gas":
          chartData.gasUsedFormatted = block.gasUsed.toNumber()
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
        <Card variant="popup">
          <LightMode>
            <HStack><Text variant='brandSecondary' fontWeight="bold">Block:</Text><Text>{payload.number}</Text></HStack>
            {(item.name === "issuance" || item.name === "reward") && <HStack><Text variant='brandSecondary' fontWeight="bold">Rewards:</Text><BigNumberText number={block.rewards} /></HStack>}
            {item.name === "issuance" && <HStack><Text variant='brandSecondary' fontWeight="bold">Burned:</Text><BigNumberText number={block.burned} /></HStack>}
            {item.name === "issuance" && <HStack><Text variant='brandSecondary' fontWeight="bold">Net Issuance:</Text><BigNumberText number={payload.issuance} /></HStack>}
            {item.name === "issuance" && <HStack><Text variant='brandSecondary' fontWeight="bold">Net Reduction:</Text><Text>{payload.reduction}%</Text></HStack>}
            {item.name === "reward" && <HStack><Text variant='brandSecondary' fontWeight="bold">Tips:</Text><BigNumberText number={block.tips} /></HStack>}
            {item.name === "basefee" && <HStack><Text variant='brandSecondary' fontWeight="bold">BaseFee:</Text><BigNumberText number={block.baseFee} /></HStack>}
            {item.name === "basefee" && <HStack><Text variant='brandSecondary' fontWeight="bold">PriorityFee:</Text><BigNumberText number={block.priorityFee} /></HStack>}
            {item.name === "gas used" && <HStack><Text variant='brandSecondary' fontWeight="bold">Gas Target:</Text><GasTarget gasTarget={block.gasTarget} /></HStack>}
            {item.name === "gas used" && <HStack><Text variant='brandSecondary' fontWeight="bold">Gas Used:</Text><GasUsed gasUsed={block.gasUsed} /></HStack>}
            {item.name === "gas used" && <HStack><Text variant='brandSecondary' fontWeight="bold">Gas Used %:</Text><GasUsedPercent gasUsed={block.gasUsed} gasTarget={block.gasTarget} /></HStack>}
          </LightMode>
        </Card>
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
    <Box flex="1" w="99%" overflow="hidden" position="relative">
      <CustomResponsiveContainer>
        <ComposedChart data={data.points} margin={{ bottom: 20, right: 10, top: 10 }} stackOffset="sign">
          <YAxis type="number" domain={[0, 'auto']} fontSize={10} tickLine={false} tickFormatter={onTickFormat} width={75} />
          <XAxis dataKey="number" angle={-30} dx={50} dy={10} fontSize={10} tickCount={10} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#2a2a2a' }} />
          {typeMapping.secondary && <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: "14px" }} />}
          <Bar type="monotone" stackId="stack" dataKey={typeMapping.primary.dataKey} fill="#FF7B24" isAnimationActive={false} name={typeMapping.primary.name}>
            {data.points.map((entry, index) => {
              const isNegative = entry[typeMapping.primary.dataKey] < 0;
              return (
                <Cell key={`cell-${index}`} fill={isNegative ? "#FFC40C" : "#FF7B24"} />
              )
            })}
          </Bar>
          {typeMapping.secondary && <Bar type="monotone" stackId="stack" dataKey={typeMapping.secondary.dataKey} fill="#FFC40C" isAnimationActive={false} name={typeMapping.secondary.name} />}
        </ComposedChart>
      </CustomResponsiveContainer>
    </Box>
  )
}

export const BaseFeeChart = React.memo(LiveChart)
