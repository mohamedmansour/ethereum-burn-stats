import { SystemProps } from "@chakra-ui/react";

interface LayoutConfig {
  margin: SystemProps["margin"],
  gap: SystemProps["gridGap"],
  miniGap: SystemProps["gridGap"],
  flexRow: SystemProps["flexDirection"],
  flexStretch: SystemProps["flex"]
}

export const layoutConfig: LayoutConfig = {
  margin: {sm: 0, md: 8},
  gap: {sm: 4, md: 5},
  miniGap: {sm: 1, md: 2},
  flexRow: {sm: "column", md: "row"},
  flexStretch: {sm: "auto", md: 1}
}
