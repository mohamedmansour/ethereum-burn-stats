import { SystemProps } from "@chakra-ui/react";

interface LayoutConfig {
  gap: number[],
  miniGap: number[],
  flexRow: SystemProps["flexDirection"]
}

export const layoutConfig: LayoutConfig = {
  gap: [4, 4, 4, 5],
  miniGap: [1, 1, 1, 2],
  flexRow: ["column", "column", "column", "row"]
}
