import { Button, HStack, Icon, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { VscDebugDisconnect } from "react-icons/vsc";
import { useBlockExplorer } from "../contexts/BlockExplorerContext";
import { useEthereum } from "../contexts/EthereumContext";
import { layoutConfig } from "../layoutConfig";

export interface AnnouncementProps {
  isOverlay?: boolean;
}

export function Announcement(props: AnnouncementProps) {
  const { eth } = useEthereum()
  const { error } = useBlockExplorer()
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    if (!eth) {
      return
    }

    const onRetryMaxAttemptsReached = (attempts: number) => {
      setMessage(`Disconnected from the server, tried ${attempts} attempts. Please refresh!`);
      eth.disconnect();
    }

    eth.on('retryMaxAttemptsReached', onRetryMaxAttemptsReached);

    return () => {
      eth.off('retryMaxAttemptsReached', onRetryMaxAttemptsReached);
    }
  }, [eth])

  useEffect(() => {
    if (!error || !eth) {
      return
    }

    setMessage(error);
    eth.disconnect();
  }, [error, eth])

  const onRefresh = () => {
    window.location.reload();
  }

  if (!message) {
    return null;
  }

  return (
    <HStack
        position={props.isOverlay ? 'fixed' : 'unset'}
        left={0}
        right={0}
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
      <Text>{message}</Text>
      <Button colorScheme="blackAlpha" onClick={onRefresh}>Refresh</Button>
    </HStack>
  )
}
