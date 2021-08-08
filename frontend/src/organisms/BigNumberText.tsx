import {
  HStack,
  HTMLChakraProps,
  Text,
} from "@chakra-ui/react";
import { BigNumber, utils } from "ethers";
import { useState } from "react";
import { useEffect } from "react";
import { Zero } from "../utils/number";
import { autoFormatBigNumber } from "../utils/wei";

export interface BigNumberProps extends HTMLChakraProps<"div"> {
  number: BigNumber | undefined;
  usdConversion?: number;
  label?: JSX.Element;
  disableTooltip?: boolean
  doNotShortenDecimals?: boolean
  hideCurrency?: boolean;
  removeCurrencyColor?: boolean
  forced?: 'ether' | 'gwei' | 'wei' | 'auto'
}

interface BigNumberState {
  prettyValue: string
  value: string
  currency: string
}

export function BigNumberFormat(props: BigNumberProps) {
  let bignumber = props.number || Zero();
  let value = '';
  let currency = ''

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

  let prettyValue = value
  let skipCommify = false
  const decimalPosition = value.indexOf(".");
  if (decimalPosition !== -1) {
    const numberOfDecimals = value.length - decimalPosition - 1 /* remove dot */;
    const decimalValue = value.substr(decimalPosition + 1);
    if (props.usdConversion && props.usdConversion > 1 && value.startsWith('0.0000')) {
        prettyValue = '< 0.0000'
        skipCommify = true
    } else if (props.doNotShortenDecimals === undefined || !props.doNotShortenDecimals) { 
      if (parseInt(decimalValue) === 0) {
        prettyValue = value.substr(0, decimalPosition);
      } else if (decimalPosition === 1 && numberOfDecimals > 4) {
        prettyValue = value.substr(0, decimalPosition + 5);
      } else if (numberOfDecimals > 2) {
        prettyValue = value.substr(0, decimalPosition + 3);
      } else if (numberOfDecimals > 1) {
        prettyValue = value.substr(0, decimalPosition + 2);
      }
    }
  }

  if (!skipCommify) {
    prettyValue = utils.commify(prettyValue)
  }

  return {
    prettyValue,
    value,
    currency
  }
}

export function BigNumberText(props: BigNumberProps) {
  const { number, usdConversion, label, disableTooltip, doNotShortenDecimals, removeCurrencyColor, forced, hideCurrency, ...rest } = props;
  const [state, setState] = useState<BigNumberState | undefined>()

  useEffect(() => {
    setState(BigNumberFormat(props))
  }, [props]);

  if (!state) {
    return (
      <HStack display="inline-flex" {...rest}>
        <Text>0</Text>
      </HStack>
    )
  }

  const currencyColor = removeCurrencyColor !== undefined && removeCurrencyColor ? undefined : "brand.secondaryText"
  if (disableTooltip !== undefined && disableTooltip) {
    return (
      <HStack display="inline-flex" {...rest} >
        <Text>{state.prettyValue}</Text>
        {!hideCurrency && <Text color={currencyColor}>{state.currency}</Text>}
      </HStack>
    )
  }

  return (
    <HStack display="inline-flex" {...rest} position="relative">
      <Text>{state.prettyValue}</Text>
      {!hideCurrency && <Text color={currencyColor}>{state.currency}</Text>}
    </HStack>
  );
}
