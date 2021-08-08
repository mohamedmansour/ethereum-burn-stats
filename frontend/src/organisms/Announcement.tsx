import { Button, HStack, Icon, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { VscDebugDisconnect } from "react-icons/vsc";
import { useEthereum } from "../contexts/EthereumContext";
import { layoutConfig } from "../layoutConfig";

export function Announcement() {
  const { eth } = useEthereum()
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!eth) {
      return
    }

    const onRetryMaxAttemptsReached = (attempts: number) => {
      setAttempts(attempts);
      eth.disconnect();
    }

    eth.on('retryMaxAttemptsReached', onRetryMaxAttemptsReached);

    return () => {
      eth.off('retryMaxAttemptsReached', onRetryMaxAttemptsReached);
    }
  }, [eth])

  const onRefresh = () => {
    window.location.reload();
  }

  if (!attempts || attempts === 0) {
    return null;
  }

  return (
    <HStack
        rounded="md"
        shadow="dark-lg"
        mt={layoutConfig.gap} 
        ml={layoutConfig.gap} 
        mr={layoutConfig.gap}
        p={2}
        justifyContent="center"
        alignItems="center"
        gridGap={layoutConfig.gap}
        textAlign="center"
        bg="tomato">
      <Icon as={VscDebugDisconnect} fontSize={32} />
      <Text>Disconnected from the server, tried {attempts} attempts. Please refresh!</Text>
      <Button colorScheme="blackAlpha" onClick={onRefresh}>Refresh</Button>
    </HStack>
  )
}
