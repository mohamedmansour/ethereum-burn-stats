import { HStack, VStack, Text } from "@chakra-ui/react";
import { ethers } from "ethers";

export interface GasUsedProps {
  gasUsed: ethers.BigNumber
  gasLimit: ethers.BigNumber
}

export function GasUsed(props: GasUsedProps) {
  const gasUsed = props.gasUsed.toNumber()
  const percentage = gasUsed / props.gasLimit.toNumber() * 100
  if (percentage === 0)
    return <Text>0</Text>

  return (
    <VStack alignItems="flex-start">
      <HStack>
        <Text size="sm">{gasUsed.toLocaleString()}</Text>
        <Text size="sm">({percentage.toFixed(2)}%)</Text>
      </HStack>
    </VStack>
  )
}