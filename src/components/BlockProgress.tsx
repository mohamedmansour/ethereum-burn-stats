import { forwardRef, HTMLChakraProps, Progress } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { BurnedBlockTransaction } from "../contexts/BlockExplorerContext";

// Chakra didn't export it.
interface ProgressOptions {
  value?: number;
  min?: number;
  max?: number;
  hasStripe?: boolean;
  isAnimated?: boolean;
  isIndeterminate?: boolean;
}

export interface BlockProgressProps extends HTMLChakraProps<"header">, ProgressOptions {
  totalSecondsPerBlock: number
  block: BurnedBlockTransaction
}

export const BlockProgress = forwardRef<BlockProgressProps, "div">(
    (props: BlockProgressProps, ref: React.ForwardedRef<any>) => {
  const [value, setValue] = useState(0);
  const { block, totalSecondsPerBlock, ...rest } = props

  useEffect(() => {
    const timeDiffInSeconds = Math.max(0, Math.floor(Date.now() / 1000) - block.timestamp)
    setValue(timeDiffInSeconds)

    const interval = window.setInterval(() => {
      setValue((value) => value + 1);
    }, 1000);

    return () => clearInterval(interval)
  }, [block]);

  return <Progress size="xs" value={value} max={totalSecondsPerBlock} {...rest} />;
});
