import {
  HStack,
  forwardRef,
  HTMLChakraProps,
  Text,
  Tooltip,
  Box,
} from "@chakra-ui/react";
import { ethers, utils } from "ethers";
import { useState } from "react";
import { useEffect } from "react";
import { autoFormatBigNumber } from "../utils/wei";

export interface BigNumberProps extends HTMLChakraProps<"div"> {
  number: ethers.BigNumber | undefined;
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

export const BigNumberText = forwardRef<BigNumberProps, "div">(
  (props: BigNumberProps, ref: React.ForwardedRef<any>) => {
    const { number, usdConversion, label, disableTooltip, doNotShortenDecimals, removeCurrencyColor, forced, hideCurrency, ...rest } = props;
    const [state, setState] = useState<BigNumberState | undefined>()

    useEffect(() => {
      if (!number) {
        return
      }

      let value = '';
      let currency = ''
  
      if (forced && forced !== 'auto') {
        value = utils.formatUnits(number, forced)
        currency = forced === 'ether' ? 'ETH' : forced.toUpperCase()
      } else if (usdConversion && usdConversion > 1)  {
        value = utils.formatEther(number.mul(usdConversion).toString())
        currency = 'USD'
      } else {
        const formatter = autoFormatBigNumber(number);
        value = formatter.value
        currency = formatter.currency
      }
  
      let prettyValue = value
      let skipCommify = false
      const decimalPosition = value.indexOf(".");
      if (decimalPosition !== -1) {
        const numberOfDecimals = value.length - decimalPosition - 1 /* remove dot */;
        const decimalValue = value.substr(decimalPosition + 1);
        if (usdConversion && usdConversion > 1 && value.startsWith('0.0000')) {
            prettyValue = '< 0.0000'
            skipCommify = true
        } else if (doNotShortenDecimals === undefined || !doNotShortenDecimals) { 
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

      setState({
        prettyValue,
        value,
        currency
      })
    }, [number, forced, usdConversion, doNotShortenDecimals]);
 
    if (!state) {
      return (
        <HStack display="inline-flex" {...rest} ref={ref} />
      )
    }

    const currencyColor = removeCurrencyColor !== undefined && removeCurrencyColor ? undefined : "brand.secondaryText"
    if (disableTooltip !== undefined && disableTooltip) {
      return (
        <HStack display="inline-flex" {...rest} ref={ref}>
          <Text>{state.prettyValue}</Text>
          {!hideCurrency && <Text color={currencyColor}>{state.currency}</Text>}
        </HStack>
      )
    }
    
    const tooltipLabel = props.label || (
      <Text>
        {state.value} {state.currency}
      </Text>
    );

    return (
      <Box {...rest} position="relative" display="inline">
        <Tooltip label={tooltipLabel}>
          <HStack display="inline-flex">
            <Text>{state.prettyValue}</Text>
            {!hideCurrency && <Text color={currencyColor}>{state.currency}</Text>}
          </HStack>
        </Tooltip>
      </Box>
    );
  }
);
