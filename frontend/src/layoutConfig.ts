import { SystemProps } from "@chakra-ui/react";

interface LayoutConfig {
  margin: SystemProps["margin"],
  gap: SystemProps["gridGap"],
  miniGap: SystemProps["gridGap"],
  flexRow: SystemProps["flexDirection"],
  flexStretch: SystemProps["flex"]
}

export const layoutConfig: LayoutConfig = {
  margin: { base: 0, md: 8 },
  gap: { base: 4, md: 5 },
  miniGap: { base: 1, md: 2 },
  flexRow: { base: "column", md: "row" },
  flexStretch: { base: "auto", md: 1 }
}
