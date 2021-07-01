import { Box, Flex, FlexOptions, forwardRef, HStack, HTMLChakraProps, useRadio, useRadioGroup, UseRadioProps, Text } from "@chakra-ui/react";
import { utils } from "ethers";
import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, TooltipProps } from 'recharts';
import { BurnedBlockTransaction } from "../contexts/BlockExplorerContext";
import { autoFormatBigNumberToString } from "../utils/wei";

interface BaseFeeChartProps extends HTMLChakraProps<"div">, FlexOptions  {
  data: BurnedBlockTransaction[]
  activated: number
}

interface RadioCardProps extends UseRadioProps {
  children: React.ReactNode
}

function RadioCard(props: RadioCardProps) {
  const { getInputProps, getCheckboxProps } = useRadio(props)

  const input = getInputProps()
  const checkbox = getCheckboxProps()

  return (
    <Box as="label">
      <input {...input} />
      <Flex
        {...checkbox}
        cursor="pointer"
        borderRadius="full"
        bg="brand.subheaderCard"
        _checked={{
          bg: "brand.orange",
          borderColor: "brand.orange",
        }}
        pl="4"
        pr="4"
        h="35px"
        align="center"
        fontSize="14px"
      >
        {props.children}
      </Flex>
    </Box>
  )
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
  const options = ["burned", "basefee", "transactions"]
  const [ chartType, setChartType ] = useState(props.activated ? 'basefee' : 'transactions')
  const { getRootProps, getRadioProps } = useRadioGroup({
    name: "chart",
    defaultValue: chartType,
    onChange: setChartType,
  })
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
        transactions: block.transactions.length
      }

      if (chartType === 'burned') {
        chartData['burned'] = parseFloat(utils.formatUnits(block.burned, 'ether'))
      }
      
      if (chartType === 'basefee') {
        chartData.basefee = parseFloat(utils.formatUnits(block.basefee, 'gwei'))
      }

      newData.push(chartData)
    }

    setData(newData)
  }, [chartType, props.data])

  const group = getRootProps()
  const isMobileLayout = window.innerWidth < 500

  return (
    <Flex ref={ref} direction="column" {...props}>
      <HStack {...group}>
        {options.map((value) => {
          const radio = getRadioProps({ value })
          return (
            <RadioCard key={value} {...radio}>
              {value}
            </RadioCard>
          )
        })}
      </HStack>
      <Box flex="1" w="99%" overflow="hidden">
        <ResponsiveContainer>
          <LineChart data={data} 
            margin={isMobileLayout ? {} : { bottom: 20, right: 50, top: 50, left: 10}}>
            {!isMobileLayout && <YAxis domain={['auto', 'auto']} /> }
            {!isMobileLayout && <XAxis dataKey="block" angle={30}  dx={20} dy={10} /> }
            <Tooltip content={<CustomTooltip />}/>
            <Line type="monotone" dataKey={chartType} stroke="rgb(221, 107, 32)" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Flex>
  )
})
