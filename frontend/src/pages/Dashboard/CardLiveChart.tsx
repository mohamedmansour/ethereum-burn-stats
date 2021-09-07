import { HTMLChakraProps, Tab, TabList, TabPanel, TabPanels, Tabs } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { Card } from "../../atoms/Card";
import { BaseFeeChart, ChartType } from "../../organisms/CryptoChart";
import { Setting } from "../../config";
import { useSettings } from "../../contexts/SettingsContext";

export interface CardLiveProps extends HTMLChakraProps<"div"> {
  type: "primary" | "secondary"
  charts: ChartType[]
}

function settingType(type: string) {
  return type === "primary" ? Setting.chartType : Setting.chartSecondaryType
}

function formatNameForChart(type: ChartType) {
  switch(type) {
    case "basefee":
      return "Base Fee";
    case "gas":
      return "Gas";
    case "issuance":
      return "Issuance";
    case "tips":
      return "Tips";
  }
}

export function CardLiveChart(props: CardLiveProps) {
  const { type, charts, ...rest } = props
  const settings = useSettings();

  const [chartType, setChartType] = useState<ChartType>(
    settings.get(settingType(type))
  );

  useEffect(() => {
    if (charts.indexOf(chartType) === -1) {
      setChartType(charts[0]);
    }
  }, [charts, chartType]);

  useEffect(() => {
    settings.set(settingType(type), chartType);
  }, [settings, type, chartType]);

  return (
    <Card
      minH={400}
      h={{ base: "auto", md: 400 }}
      flexShrink={0}
      {...rest}
    >
      <Tabs isLazy variant="unstyled" flex={1} display="flex" flexDirection="column">
        <TabList userSelect="none">
          {charts.map((value) => (
            <Tab key={`tab-${value}`} fontSize="xl" pl={0} pt={0} pr={0} pb={2} mr={4} _selected={{ color: "white", fontWeight: "bold" }}>{formatNameForChart(value)}</Tab>
          ))}
        </TabList>
        <TabPanels display="flex" flex={1}>
          {charts.map((value) => {
            return (
              <TabPanel key={`panel-${value}`} display="flex" flex={1} padding={0}>
                <BaseFeeChart chartType={value} />
              </TabPanel>
            )
          })}
        </TabPanels>
      </Tabs>

    </Card>
  );
}
