import { Heading, Text, VStack } from "@chakra-ui/react";
import { utils } from "ethers";
import { useState } from "react";
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card } from "../components/Card";
import { Loader } from "../components/Loader";
import { PageTitle } from "../components/PageTitle";
import { useEthereum } from "../contexts/EthereumContext";

export function EthAccountDetail() {
  let { id } = useParams<{ id: string }>();
  const { eth } = useEthereum();
  const [balance, setBalance] = useState<string>();

  useEffect(() => {
    if (!eth) return;

    (async () => {
      setBalance(utils.formatEther(await eth.getBalance(id)));
    })();
  }, [eth, id]);

  if (!balance === undefined) {
    return <Loader>Loading balance...</Loader>;
  }

  return (
    <VStack m="4" mt="0" align="flex-start" h="100%">
      <PageTitle title="Account" subtitle={id} />
      <Card overflow="auto" w="100%">
        <Heading size="sm">Balance:</Heading>
        <Text>{balance} ETH</Text>
      </Card>
    </VStack>
  );
}
