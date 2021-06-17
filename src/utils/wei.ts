import { utils } from "ethers"

export function formatWei(wei: string, autoFormat: boolean): string {
  if (wei === '0')
    return wei

  if (!autoFormat)
    return utils.commify(wei)

  const gwei = parseFloat(utils.formatUnits(wei, 'gwei'))
  if (gwei > 1)
    return gwei.toFixed(2)

  if (gwei > 0.1)
    return gwei.toFixed(3)
    
  if (gwei > 0.01)
    return gwei.toFixed(4)

  if (gwei > 0.001)
    return gwei.toFixed(5)

  return gwei.toFixed(6)
}