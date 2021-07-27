import { Box, FlexOptions, forwardRef, HStack, HTMLChakraProps, Text } from "@chakra-ui/react";
import { utils } from "ethers";
import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, TooltipProps } from 'recharts';
import { BurnedBlockTransaction } from "../contexts/BlockExplorerContext";
import { autoFormatBigNumberToString } from "../utils/wei";

interface BaseFeeChartProps extends HTMLChakraProps<"div">, FlexOptions  {
  data: BurnedBlockTransaction[]
  activated: number
}

interface CustomTooltipProps extends TooltipProps<string, string> {

}

function CustomTooltip(props: CustomTooltipProps)  {
  if (props.active && props.payload && props.payload.length) {
    const payload = props.payload[0].payload
    return (
      <Box bg="brand.subheader" p="4">
        <HStack><Text color="brand.secondaryText">Block:</Text><Text>{payload.block}</Text></HStack>
        <HStack><Text color="brand.secondaryText">Burned:</Text><Text>{payload.burnedFormatted}</Text></HStack>
        <HStack><Text color="brand.secondaryText">Basefee:</Text><Text>{payload.basefeeFormatted}</Text></HStack>
        <HStack><Text color="brand.secondaryText">Txs:</Text><Text>{payload.transactions}</Text></HStack>
      </Box>
    );
  }

  return null;
};

export const BaseFeeChart = forwardRef<BaseFeeChartProps, 'div'>((props: BaseFeeChartProps, ref: React.ForwardedRef<any>) => {
  const [data, setData] = useState<any[]>([])

  useEffect(() => {
    const newData = []

    for (let i = props.data.length-1; i >= 0; i--) {
      const block = props.data[i]
      const chartData: {[key: string]: any} = {
        index: i,
        block: block.number,
        burnedFormatted: autoFormatBigNumberToString(block.burned),
        basefeeFormatted: autoFormatBigNumberToString(block.basefee),
        transactions: block.transactions.length,
        basefee: parseFloat(utils.formatUnits(block.basefee, 'wei'))
      }

      newData.push(chartData)
    }

    setData(newData)
  }, [props.data])

  const isMobileLayout = window.innerWidth < 500

  return (
    <Box flex="1" w="99%" overflow="hidden">
      <ResponsiveContainer>
        <LineChart data={data} 
          margin={isMobileLayout ? {} : { bottom: 20, right: 50, top: 50}}>
          {!isMobileLayout && <YAxis type="number" domain={['0', 'auto']} fontSize={10} tickLine={false} /> }
          {!isMobileLayout && <XAxis hide dataKey="block" angle={30} dx={20} dy={10} fontSize={10} /> }
          <Tooltip content={<CustomTooltip />}/>
          <Line type="monotone" dataKey="basefee" stroke="rgb(221, 107, 32)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  )
})
