import {
  HStack,
  forwardRef,
  HTMLChakraProps,
  Text,
  Tooltip,
  Box,
} from "@chakra-ui/react";
import { ethers, utils } from "ethers";
import { autoFormatBigNumber } from "../utils/wei";

export interface BigNumberProps extends HTMLChakraProps<"div"> {
  number: ethers.BigNumber;
  usdConversion?: number;
  label?: JSX.Element;
  disableTooltip?: boolean
  doNotShortenDecimals?: boolean
  removeCurrencyColor?: boolean
}

export const BigNumberText = forwardRef<BigNumberProps, "div">(
  (props: BigNumberProps, ref: React.ForwardedRef<any>) => {
    const { number, usdConversion, label, disableTooltip, doNotShortenDecimals, removeCurrencyColor, ...rest } = props;

    let value = '';
    let currency = ''

    if (usdConversion && usdConversion > 1)  {
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
      const numberOfDecimals = value.length - decimalPosition;
      if (usdConversion && usdConversion > 1 && value.startsWith('0.0000')) {
          prettyValue = '< 0.0000'
          skipCommify = true
      } else if (doNotShortenDecimals === undefined || !doNotShortenDecimals) {
        if (numberOfDecimals > 4) {
          prettyValue = value.substr(0, decimalPosition + 5);
        }
      }
    }
  
    if (!skipCommify) {
      prettyValue = utils.commify(prettyValue)
    }

    const currencyColor = removeCurrencyColor !== undefined && removeCurrencyColor ? undefined : "brand.secondaryText"
    if (disableTooltip !== undefined && disableTooltip) {
      return (
        <HStack display="inline-flex" {...rest} ref={ref}>
          <Text>{prettyValue}</Text>
          <Text color={currencyColor}>{currency}</Text>
        </HStack>
      )
    }
    
    const tooltipLabel = props.label || (
      <Text>
        {value} {currency}
      </Text>
    );

    return (
      <Box {...rest} position="relative" display="inline">
        <Tooltip label={tooltipLabel}>
          <HStack display="inline-flex">
            <Text>{prettyValue}</Text>
            <Text color={currencyColor}>{currency}</Text>
          </HStack>
        </Tooltip>
      </Box>
    );
  }
);
