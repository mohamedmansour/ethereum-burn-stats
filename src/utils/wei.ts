import { ethers, utils } from "ethers";

export const OneGwei = utils.parseUnits("1", "gwei");
export const OneEther = utils.parseUnits("1", "ether");

export function formatCurrency(useGwei: boolean): string {
  return useGwei ? "gwei" : "wei";
}

export function formatBigNumber(
  number: ethers.BigNumber,
  useGwei: boolean
): string {
  if (number.isZero()) {
    return "0";
  }

  if (!useGwei) {
    return utils.commify(utils.formatUnits(number, "wei"));
  }

  const gwei = parseFloat(utils.formatUnits(number, 'gwei'))
  if (gwei > 1)
    return gwei.toFixed(2)

  if (gwei > 0.1)
    return gwei.toFixed(3)

  if (gwei > 0.01)
    return gwei.toFixed(4)

  if (gwei > 0.001)
    return gwei.toFixed(5)

  if (gwei > 0.0001)
    return gwei.toFixed(6)

  if (gwei > 0.00001)
    return gwei.toFixed(7)

  return gwei.toFixed(8)
}
