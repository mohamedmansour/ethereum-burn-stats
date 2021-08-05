import { Text } from "@chakra-ui/react";
import { BigNumber } from "ethers";

export interface GasUsedProps {
  activated: boolean
  gasUsed: BigNumber
  gasLimit: BigNumber
}

export function GasTarget(props: GasUsedProps) {
  var gasTarget = props.gasLimit.toNumber()
  if (props.activated) {
    gasTarget = props.gasLimit.toNumber() / 2
  }

  return (
        <Text size="sm">{gasTarget.toLocaleString(undefined, {'minimumFractionDigits': 0, 'maximumFractionDigits': 0})}</Text>
  )
}

export function GasUsed(props: GasUsedProps) {
  const gasUsed = props.gasUsed.toNumber()

  return (
        <Text size="sm">{gasUsed.toLocaleString(undefined, {'minimumFractionDigits': 0, 'maximumFractionDigits': 0})}</Text>
  )
}

export function GasUsedPercent(props: GasUsedProps) {
  const gasUsed = props.gasUsed.toNumber()
  var gasTarget = props.gasLimit.toNumber()
  if (props.activated) {
    gasTarget = props.gasLimit.toNumber() / 2
  }
  const percentage = gasUsed / gasTarget * 100

  return (
        <Text size="sm">{percentage.toFixed(0)}%</Text>
  )
}
