import { ethers } from "ethers";

export function BigNumberMin(x: ethers.BigNumber, y: ethers.BigNumber): ethers.BigNumber {
  return x.lt(y) ? x : y;
}

export function BigNumberMax(x: ethers.BigNumber, y: ethers.BigNumber): ethers.BigNumber {
  return x.gt(y) ? x : y;
}

export function BigNumberNormalize(num: any): ethers.BigNumber {
  if (num === null || num === undefined) {
    return ethers.BigNumber.from(0);
  }
  return ethers.BigNumber.from(num);
}