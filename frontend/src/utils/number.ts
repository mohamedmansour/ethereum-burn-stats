import { BigNumber } from "ethers";

export function BigNumberMin(x: BigNumber, y: BigNumber): BigNumber {
  return x.lt(y) ? x : y;
}

export function BigNumberMax(x: BigNumber, y: BigNumber): BigNumber {
  return x.gt(y) ? x : y;
}

export function HexToBigNumber(num: any): BigNumber {
  if (num === null || num === undefined) {
    return BigNumber.from(0);
  }
  return BigNumber.from(num);
}

export function HexToNumber(num: any): number {
  if (num === null || num === undefined || num === "") {
    return 0;
  }

  return parseInt(Number(num).toString(), 10);
}

export function Zero(): BigNumber {
  return BigNumber.from(0);
}