import { Badge, Box, Button, Flex, Heading, HStack } from "@chakra-ui/react";
import React from "react";
import { useEffect, useState } from "react"
import { FirePit } from "../atoms/FirePit";
import { layoutConfig } from "../layoutConfig";

enum SocketStatus {
  CONNECTING,
  CONNECTED,
  DISCONNECTED,
}

interface CommandEvent {
  type: string;
  data: unknown;
}

export function Api() {
  const [status, setStatus] = useState(SocketStatus.CONNECTING)
  const [connection, setConnection] = useState<WebSocket>()
  const [log, setLog] = useState<string[]>()

  useEffect(() => {
    let conn: WebSocket;

    const onClose = (evt: CloseEvent) => {
      setStatus(SocketStatus.DISCONNECTED)
    }

    const onOpen = (evt: Event) => {
      setStatus(SocketStatus.CONNECTED)
      setConnection(conn);
    }

    const onMessage = (evt: MessageEvent<CommandEvent>) => {
      setLog(log => [...(log || []), evt.data.toString()])
    }

    const connectToWebSocket = () => {
      conn = new WebSocket("ws://" + document.location.host + "/ws");
      conn.addEventListener("close", onClose);
      conn.addEventListener("message", onMessage);
      conn.addEventListener("open", onOpen);
    }

    connectToWebSocket();

    return () => {
      if (conn) {
        conn.removeEventListener("close", onClose);
        conn.removeEventListener("message", onMessage);
        conn.removeEventListener("open", onOpen);
      }
    }
  }, [])

  let connectedColor = status === SocketStatus.CONNECTED ? "green" : status === SocketStatus.DISCONNECTED ? "red" : "gray";

  return (
    <Flex pt={layoutConfig.gap} pl={layoutConfig.gap} pr={layoutConfig.gap} direction="column">
      <HStack cursor="pointer">
        <FirePit sparkCount={12} size="24px" />
        <Heading size="lg" color="white">Watch The <Box display="inline" color="brand.orange">Burn</Box></Heading>
      </HStack>
      <Flex flex={1} mt={8} flexDirection="column">
        <Box><Badge colorScheme={connectedColor}>{SocketStatus[status]}</Badge></Box>
        <HStack mt={4}>
          <Button flexShrink={0} colorScheme="teal">debug_burned</Button>
          <Button flexShrink={0} colorScheme="teal">debug_getBlockReward</Button>
          <Button flexShrink={0} colorScheme="teal">eth_syncing</Button>
          <Button flexShrink={0} colorScheme="teal">eth_getBlockWithTransactions</Button>
          <Button flexShrink={0} colorScheme="teal">eth_getTransaction</Button>
          <Button flexShrink={0} colorScheme="teal">eth_getGasPrice</Button>
        </HStack>
        <Box pt={4}>
          {log && log.map((l, i) => <div key={i}>{l}</div>)}
        </Box>
      </Flex>
    </Flex>
  )
}
