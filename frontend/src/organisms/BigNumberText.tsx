import {
  HStack,
  HTMLChakraProps,
  Text,
  TextProps,
} from "@chakra-ui/react";
import { BigNumber, utils } from "ethers";
import { useMemo } from "react";
import { Zero } from "../utils/number";
import { autoFormatBigNumber } from "../utils/wei";

export type BigNumberType = 'ether' | 'gwei' | 'wei' | 'auto'

export interface BigNumberProps extends HTMLChakraProps<"div"> {
  number: BigNumber | undefined;
  usdConversion?: number;
  maximumFractionDigits?: number
  removeCurrencyColor?: boolean
  valueStyle?: TextProps
  currencyStyle?: TextProps
}

interface BigNumberState {
  prettyValue: string
  value: string
  currency: string
}

interface BigNumberFormatProps {
  number: BigNumber | undefined
  usdConversion?: number
  maximumFractionDigits?: number
}

export function BigNumberFormat(props: BigNumberFormatProps) {
  let bignumber = props.number || Zero;
  let negative = ''
  let value = '';
  let currency = ''

  if (bignumber.isNegative()) {
    negative = '-'
    bignumber = bignumber.abs()
  }

  if (props.usdConversion && props.usdConversion > 1)  {
    value = utils.formatEther(bignumber.mul(Math.floor(props.usdConversion * 100)).div(BigNumber.from(100)).toString())
    currency = 'USD'
  } else {
    const formatter = autoFormatBigNumber(bignumber);
    value = formatter.value
    currency = formatter.currency
  }

  let maximumFractionDigits = 0;
  if (props.maximumFractionDigits) maximumFractionDigits = props.maximumFractionDigits;
  else if (currency === 'ETH') maximumFractionDigits = 4;
  else if (currency === 'USD') maximumFractionDigits = 2;
  if (maximumFractionDigits === -1) maximumFractionDigits = 0;

  let prettyValue = negative.concat(parseFloat(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits}));
  if (currency === 'USD') {
    prettyValue = '$' + prettyValue
  }

  return {
    prettyValue,
    value,
    currency
  }
}

export function BigNumberText(props: BigNumberProps) {
  const { number, usdConversion, removeCurrencyColor, maximumFractionDigits, valueStyle, currencyStyle, ...rest } = props;
  const state = useMemo<BigNumberState>(() => 
    BigNumberFormat({
      number: props.number, 
      usdConversion: props.usdConversion,
      maximumFractionDigits: props.maximumFractionDigits
    }), [props.number, props.usdConversion, props.maximumFractionDigits]);


  if (!state) {
    return (
      <HStack display="inline-flex" {...rest}>
        <Text {...valueStyle}>0</Text>
      </HStack>
    )
  }

  const currencyColor = removeCurrencyColor !== undefined && removeCurrencyColor ? undefined : "brandSecondary"
  return (
    <HStack display="inline-flex" {...rest} position="relative" title={`${state.value} ${state.currency}`}>
      <Text flex={1} {...valueStyle}>{state.prettyValue}</Text>
      <Text variant={currencyColor} fontSize="xs" {...currencyStyle}>{state.currency}</Text>
    </HStack>
  );
}
