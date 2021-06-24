import { ethers, utils } from "ethers";

export const OneGwei = utils.parseUnits("1", "gwei");
export const OneEther = utils.parseUnits("1", "ether");

type FormatUnit = 'gwei'|'ether'|'wei'

export function formatBigNumber(
  number: ethers.BigNumber,
  unit: FormatUnit
): string {
  if (number.isZero()) {
    return "0";
  }

  const value = parseFloat(utils.formatUnits(number, unit))
  if (value > 1)
    return utils.commify(Number.isInteger(value) ? value : value.toFixed(2))

  if (value > 0.1)
    return value.toFixed(3)

  if (value > 0.01)
    return value.toFixed(4)

  if (value > 0.001)
    return value.toFixed(5)

  if (value > 0.0001)
    return value.toFixed(6)

  if (value > 0.00001)
    return value.toFixed(7)

  return value.toFixed(8)
}

