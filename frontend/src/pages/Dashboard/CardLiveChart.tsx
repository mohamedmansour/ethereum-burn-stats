import { Text, HStack, Icon, useRadio, Box, UseRadioProps, useRadioGroup, Grid, Flex } from "@chakra-ui/react";
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
    <Box as="label" fontSize={12}>
      <input {...input} style={{display: "none"}}/>
      <Box
        {...checkbox}
        cursor="pointer"
        borderWidth="1px"
        borderRadius="sm"
        boxShadow="md"
        borderColor="brand.secondaryText"
        color="brand.secondaryText"
        textAlign="center"
        pt={1}
        pb={1}
        pr={2}
        pl={2}
        _checked={{
          bg: "brand.orange",
          color: "white",
          borderColor: "brand.orange",
        }}
        _focus={{
          boxShadow: "outline",
        }}
      >
        {props.children}
      </Box>
    </Box>
  )
}

export function CardLiveChart(props: RadioCardProps) {
  const [chartType, setChartType] = useState<ChartType>('basefee')
  const options: ChartType[] = ["tips & burned", "basefee", "transactions", "gas"]
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
      <Flex justifyContent={["center", "center", "flex-end"]}>
        <Grid {...group} templateColumns={["repeat(2, 1fr)","repeat(2, 1fr)","repeat(4, 1fr)"]} display="inline-grid" gridGap={2} mt={2} mb={2}>
          {options.map((value) => {
            const radio = getRadioProps({ value })
            return (
              <RadioCard key={value} {...radio}>
                {value}
              </RadioCard>
            )
          })}
        </Grid>
      </Flex>
      <BaseFeeChart data={props.blocks || []} chartType={chartType} />
    </Card>
  );
}
