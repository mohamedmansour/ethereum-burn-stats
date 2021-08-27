import { useRadio, Box, UseRadioProps, useRadioGroup, Grid, Flex, HTMLChakraProps } from "@chakra-ui/react";
import { FaChartLine } from 'react-icons/fa';
import { useEffect, useState } from "react";
import { Card } from "../../atoms/Card";
import { BaseFeeChart, ChartType } from "../../organisms/BaseFeeChart";
import { BlockStats } from "../../libs/ethereum";
import { ChartTypes, Setting } from "../../config";
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
        variant="brandSecondary"
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

export function CardLiveChart(props: HTMLChakraProps<"div">) {
  const settings = useSettings();
  const [doNotShowChart, setDoNotShowChart] = useState<boolean>(
    settings.get(Setting.doNotShowChart)
  );
  
  const [chartType, setChartType] = useState<ChartType>(
    settings.get(Setting.chartType)
  );

  useEffect(() => {
    settings.set(Setting.doNotShowChart, doNotShowChart);
  }, [settings, doNotShowChart]);

  useEffect(() => {
    settings.set(Setting.chartType, chartType);
  }, [settings, chartType]);

  const { getRootProps, getRadioProps } = useRadioGroup({
    name: "chart",
    defaultValue: chartType,
    onChange: (value: ChartType) => setChartType(value),
  })

  const group = getRootProps()

  return (
    <Card
      title="Live Chart"
      icon={FaChartLine}
      collapsible={doNotShowChart}
      onCollapsed={(collapsed) => setDoNotShowChart(collapsed)}
      minH={doNotShowChart ? 0 : 400}
      h={["auto", "auto", doNotShowChart ? "auto" : 400]} flexShrink={0}
      {...props}
    >
      <Flex justifyContent={["center", "center", "flex-end"]}>
        <Grid {...group} templateColumns={["repeat(2, 1fr)", "repeat(2, 1fr)", "repeat(4, 1fr)"]} display="inline-grid" gridGap={2} mt={2} mb={2}>
          {ChartTypes.map((value) => {
            const radio = getRadioProps({ value })
            return (
              <RadioCard key={value} {...radio}>
                {value}
              </RadioCard>
            )
          })}
        </Grid>
      </Flex>
      <BaseFeeChart chartType={chartType} />
    </Card>
  );
}
