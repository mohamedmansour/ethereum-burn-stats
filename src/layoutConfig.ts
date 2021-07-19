import { SystemProps } from "@chakra-ui/react";

interface LayoutConfig {
  gap: number[],
  flexRow: SystemProps["flexDirection"]
}

export const layoutConfig: LayoutConfig = {
  gap: [4, 4, 8],
  flexRow: ["column", "column", "row"]
}
