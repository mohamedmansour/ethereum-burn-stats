import { Badge, Box, Button, Flex, Heading, HStack, Input, propNames, useToast, } from "@chakra-ui/react";
import { useCallback, useEffect, useRef, useState } from "react"
import { Card } from "../atoms/Card";
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

export function ChatInput({onSendChat}: {onSendChat: (msg: string) => void}) {
  const [input, setInput] = useState("");

  const onKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onSendChat(input);
    }
  }

  const onInputChanged = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  }
  
  const sendChat = () => {
    onSendChat(input);
  }

  return (
    <HStack>
      <Input placeholder="chat message" onKeyUp={onKeyUp} onChange={onInputChanged} />
      <Button flexShrink={0} colorScheme="teal" onClick={sendChat}>sendChat</Button>
    </HStack>
  )
}
export function Api() {
  const toast = useToast()
  const ref = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState(SocketStatus.CONNECTING)
  const [connection, setConnection] = useState<WebSocket>()
  const [logs, setLogs] = useState<string[]>()

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
      setLogs(logs => [...(logs || []), evt.data.toString()])
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

  useEffect(() => {
    if (!ref.current)
      return
    ref.current.scrollTop = ref.current.scrollHeight;
  }, [logs]);

  const onSendMessage = useCallback((chatMessage: string) => {
    if (!connection) {
      return
    }

    connection.send(JSON.stringify({type: "message", data: { message: chatMessage }}));
  }, [connection])


  const onGetBlockClicked = () => {
    if (!connection || status !== SocketStatus.CONNECTED) {
      toast({
        title: "Not connected to API",
        status: "error",
        isClosable: false
      });
      return;
    }

    setLogs(logs => [...(logs || []), "1"])
  }

  let connectedColor = status === SocketStatus.CONNECTED ? "green" : status === SocketStatus.DISCONNECTED ? "red" : "gray";

  return (
    <Flex p={layoutConfig.gap} direction="column" height="inherit">
      <HStack cursor="pointer">
        <FirePit sparkCount={12} size="24px" />
        <Heading size="lg" color="white">Watch The <Box display="inline" color="brand.orange">Burn</Box></Heading>
      </HStack>
      <Flex flex={1} mt={8} flexDirection="column" gridGap={8} minHeight={0}>
        <Box><Badge colorScheme={connectedColor}>{SocketStatus[status]}</Badge></Box>
        <Card align="flex-start" title="Commands">
          <HStack>
            <HStack>
              <Input placeholder="block number" />
              <Button flexShrink={0} colorScheme="teal" onClick={onGetBlockClicked}>getBlock</Button>
            </HStack>
            <ChatInput onSendChat={onSendMessage} />
          </HStack>
        </Card>
        <Card title="Logs" flex={1} overflow="hidden">
          <Box overflow="auto" flex={1} ref={ref}>
            {logs && logs.map((log, i) => <div key={i}>{log}</div>)}
          </Box>
        </Card>
      </Flex>
    </Flex>
  )
}
