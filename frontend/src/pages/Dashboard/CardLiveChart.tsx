import { Text, HStack, Icon, useRadio, Box, UseRadioProps, useRadioGroup } from "@chakra-ui/react";
import { FaChartLine } from 'react-icons/fa';
import { Card } from "../../atoms/Card";
import { BaseFeeChart, ChartType } from "../../organisms/BaseFeeChart";
import { BlockStats } from "../../contexts/EthereumContext";
import { layoutConfig } from "../../layoutConfig";
import { useState } from "react";

interface RadioCardProps extends UseRadioProps {
  children?: React.ReactNode
  blocks?: BlockStats[]
}

function RadioCard(props: RadioCardProps) {
  const { getInputProps, getCheckboxProps } = useRadio(props)

  const input = getInputProps()
  const checkbox = getCheckboxProps()

  return (
    <Box as="label">
      <input {...input} />
      <Box
        {...checkbox}
        cursor="pointer"
        borderWidth="1px"
        borderRadius="md"
        boxShadow="md"
        _checked={{
          bg: "brand.orange",
          color: "white",
          borderColor: "brand.orange",
        }}
        _focus={{
          boxShadow: "outline",
        }}
        px={2}
        py={1}
      >
        {props.children}
      </Box>
    </Box>
  )
}

export function CardLiveChart(props: RadioCardProps) {
  const [chartType, setChartType] = useState<ChartType>('basefee')
  const options: ChartType[] = ["tips & burned", "basefee", "transactions"]
  const { getRootProps, getRadioProps } = useRadioGroup({
    name: "chart",
    defaultValue: "basefee",
    onChange: (value: ChartType) => setChartType(value),
  })

  const group = getRootProps()

  return (
    <Card
      gridGap={layoutConfig.miniGap}
      minH={300}
      h={["auto", "auto", 300]} flexShrink={0}
    >
      <HStack>
        <Icon as={FaChartLine} />
        <Text fontSize="md" fontWeight="bold">
          Live Chart
        </Text>
      </HStack>
      <HStack {...group} justifyContent="flex-end">
        {options.map((value) => {
          const radio = getRadioProps({ value })
          return (
            <RadioCard key={value} {...radio}>
              {value}
            </RadioCard>
          )
        })}
      </HStack>
      <BaseFeeChart data={props.blocks || []} chartType={chartType} />
    </Card>
  );
}
