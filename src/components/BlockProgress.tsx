import { Progress } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { BurnedBlockTransaction } from "../contexts/BlockExplorerContext";

export interface BlockProgressProps {
  totalSecondsPerBlock: number
  block: BurnedBlockTransaction
}

export function BlockProgress(props: BlockProgressProps) {
  const [value, setValue] = useState(0);
  const { block, totalSecondsPerBlock } = props

  useEffect(() => {
    const timeDiffInSeconds = Math.max(0, Math.floor(Date.now() / 1000) - block.timestamp)
    setValue(timeDiffInSeconds)

    const interval = window.setInterval(() => {
      setValue((value) => value + 1);
    }, 1000);

    return () => clearInterval(interval)
  }, [block]);

  return <Progress size="xs" value={value} max={totalSecondsPerBlock} />;
}
