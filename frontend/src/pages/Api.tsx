import { Badge, Box, Button, Flex, Heading, HStack, Input, useToast, } from "@chakra-ui/react";
import { utils } from "ethers";
import { useEffect, useRef, useState } from "react"
import { Card } from "../atoms/Card";
import { FirePit } from "../atoms/FirePit";
import {  DaemonClientProvider, useDaemonClient } from "../contexts/DaemonClientContext";
import { layoutConfig } from "../layoutConfig";

enum SocketStatus {
  CONNECTING,
  CONNECTED,
  DISCONNECTED,
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

export function ApiPage() {
  const toast = useToast()
  const ref = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState(SocketStatus.CONNECTING)
  const client = useDaemonClient()
  const [logs, setLogs] = useState<string[]>()

  useEffect(() => {
    if (!client.eth) {
      return;
    }

    const onBlock = (block: any) => {
      console.log(block, block.number);
      if (!block.number) {
        debugger;
      }
      setLogs(logs => [...(logs || []), block.number.toString()])
    }

    client.eth.on('block', onBlock)

    return () => client.eth?.off('block', onBlock)
  }, [client])

  useEffect(() => {
    if (!ref.current)
      return
    ref.current.scrollTop = ref.current.scrollHeight;
  }, [logs]);

  // const onSendMessage = useCallback((chatMessage: string) => {
  //   connection.send(JSON.stringify({type: "message", data: { message: chatMessage }}));
  // }, [connection])


  const onGetBlockClicked = async () => {
    if (!client.eth) {
      toast({
        title: "Not connected to API",
        status: "error",
        isClosable: false
      });
      return;
    }

    const blockNumberInHex = utils.hexValue(1234)
    const block = await client.eth.getBlock(blockNumberInHex)
    setLogs(logs => [...(logs || []), block.hash])
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
            {/* <ChatInput onSendChat={onSendMessage} /> */}
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

export function Api() {
  return (
    <DaemonClientProvider url="ws://localhost:8080">
      <ApiPage />
    </DaemonClientProvider>
  )
}
