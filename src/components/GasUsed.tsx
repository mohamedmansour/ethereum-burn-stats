import { HStack, VStack, Text } from "@chakra-ui/react";

export interface GasUsedProps {
  gasUsed: number
  gasLimit: number
}

export function GasUsed(props: GasUsedProps) {
  const percentage = props.gasUsed / props.gasLimit * 100
  if (percentage === 0)
    return <Text>0</Text>

  return (
    <VStack alignItems="flex-start">
      <HStack>
        <Text size="sm">{props.gasUsed.toLocaleString()}</Text>
        <Text size="sm">({percentage.toFixed(2)}%)</Text>
      </HStack>
    </VStack>
  )
}