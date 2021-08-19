import {
  HStack,
  HTMLChakraProps,
  Text,
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
  hideCurrency?: boolean;
  removeCurrencyColor?: boolean
  forced?: BigNumberType
}

interface BigNumberState {
  prettyValue: string
  value: string
  currency: string
}

interface BigNumberFormatProps {
  number: BigNumber | undefined
  forced?: BigNumberType
  usdConversion?: number
  maximumFractionDigits?: number
}

export function BigNumberFormat(props: BigNumberFormatProps) {
  let bignumber = props.number || Zero();
  let negative = ''
  let value = '';
  let currency = ''

  if (bignumber.isNegative()) {
    negative = '-'
    bignumber = bignumber.abs()
  }

  if (props.forced && props.forced !== 'auto') {
    value = utils.formatUnits(bignumber, props.forced)
    currency = props.forced === 'ether' ? 'ETH' : props.forced.toUpperCase()
  } else if (props.usdConversion && props.usdConversion > 1)  {
    value = utils.formatEther(bignumber.mul(props.usdConversion).toString())
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

  const valueNumber = negative.concat(parseFloat(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits}));

  return {
    prettyValue: valueNumber,
    value,
    currency
  }
}

export function BigNumberText(props: BigNumberProps) {
  const { number, usdConversion, removeCurrencyColor, maximumFractionDigits, forced, hideCurrency, ...rest } = props;
  const state = useMemo<BigNumberState>(() => 
    BigNumberFormat({
      number: props.number, 
      forced: props.forced, 
      usdConversion: props.usdConversion,
      maximumFractionDigits: props.maximumFractionDigits
    }), [props.number, props.forced, props.usdConversion, props.maximumFractionDigits]);

  if (!state) {
    return (
      <HStack display="inline-flex" {...rest}>
        <Text>0</Text>
      </HStack>
    )
  }

  const currencyColor = removeCurrencyColor !== undefined && removeCurrencyColor ? undefined : "brandSecondary"
  return (
    <HStack display="inline-flex" {...rest} position="relative" title={`${state.value} ${state.currency}`}>
      <Text>{state.prettyValue}</Text>
      {!hideCurrency && <Text variant={currencyColor}>{state.currency}</Text>}
    </HStack>
  );
}
