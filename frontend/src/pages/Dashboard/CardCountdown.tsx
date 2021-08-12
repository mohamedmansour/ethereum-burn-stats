import { Text, Box } from "@chakra-ui/react";
import { FaClock } from 'react-icons/fa';
import { Card } from "../../atoms/Card";
import { useEffect, useState } from "react";
import { useEthereum } from "../../contexts/EthereumContext";
import { ActivationObj } from "./Dashboard";

export function CardCountdown({ genesisBlock, currentBlock }: { genesisBlock: number; currentBlock: number; }) {
  const { eth } = useEthereum();
  const [timePerBlockInMs, setTimePerBlockInMs] = useState(0);
  const [activation, setActivation] = useState<ActivationObj>();
  const numberOfBlocksToLookback = 6500; // ~6500 blocks in 24 hours

  // To save on number of calls to geth, just cache the seconds per block.
  useEffect(() => {
    if (!eth)
      return;
    const run = async () => {
      const current = await eth.getBlockStats(currentBlock);
      const previous = await eth.getBlockStats(currentBlock - numberOfBlocksToLookback);
      if (current && previous) {
        setTimePerBlockInMs(((current.timestamp - previous.timestamp) * 1000) / numberOfBlocksToLookback);
      }
    };

    run();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    const blockTimeInSec = (timePerBlockInMs / 1000).toLocaleString(undefined, { 'minimumFractionDigits': 2, 'maximumFractionDigits': 2 });
    const blocksRemaining = genesisBlock - currentBlock;
    const activationDate = new Date(Date.now() + timePerBlockInMs * blocksRemaining);
    const dtf = new Intl.DateTimeFormat(navigator.language, { dateStyle: 'long', timeStyle: 'long' });
    const estimatedTime = dtf.format(activationDate);
    setActivation({
      blocksRemaining,
      blockTimeInSec,
      estimatedTime
    });
  }, [genesisBlock, currentBlock, timePerBlockInMs]);

  if (!activation) {
    return <Text>Please wait, calculating approximate time...</Text>;
  }

  return (
    <Card 
        title={`${eth?.connectedNetwork.name} Countdown`}
        icon={FaClock}
        w="100%"
        textAlign="center">
      <Box>
        <Text fontSize={[60, 60, 80]} lineHeight={['60px', '60px', '80px']}>{activation.blocksRemaining}</Text>
        <Text fontSize={[10, 10, 12]} color="brand.secondaryText">Blocks Remaining</Text>
      </Box>
      <Box pt={[2, 2, 4]}>
        <Text fontSize={[16, 16, 24]} lineHeight={['16px', '16px', '24px']}>{activation.estimatedTime}</Text>
        <Text fontSize={[10, 10, 12]} mt={1} color="brand.secondaryText">Estimated Activation @ {activation.blockTimeInSec} sec/block</Text>
      </Box>
    </Card>
  );
}
