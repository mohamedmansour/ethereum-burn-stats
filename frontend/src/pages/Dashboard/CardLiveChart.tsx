import { useRadio, Box, UseRadioProps, useRadioGroup, Grid, Flex } from "@chakra-ui/react";
import { FaChartLine } from 'react-icons/fa';
import { useEffect, useState } from "react";
import { Card } from "../../atoms/Card";
import { BaseFeeChart, ChartType } from "../../organisms/BaseFeeChart";
import { BlockStats } from "../../libs/ethereum";
import { Setting } from "../../config";
import { useSettings } from "../../contexts/SettingsContext";

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
      <input {...input} style={{ display: "none" }} />
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
  const settings = useSettings();
  const [doNotShowChart, setDoNotShowChart] = useState<boolean>(
    settings.get(Setting.doNotShowChart)
  );

  useEffect(() => {
    settings.set(Setting.doNotShowChart, doNotShowChart);
  }, [settings, doNotShowChart]);

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
      title="Live Chart"
      icon={FaChartLine}
      collapsible={doNotShowChart}
      onCollapsed={(collapsed) => setDoNotShowChart(collapsed)}
      minH={doNotShowChart ? 0 : 300}
      h={["auto", "auto", doNotShowChart ? "auto" : 300]} flexShrink={0}
    >
      <Flex justifyContent={["center", "center", "flex-end"]}>
        <Grid {...group} templateColumns={["repeat(2, 1fr)", "repeat(2, 1fr)", "repeat(4, 1fr)"]} display="inline-grid" gridGap={2} mt={2} mb={2}>
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
