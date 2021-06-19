import {
  Box,
  Heading,
  Text,
} from "@chakra-ui/react";
import { utils } from "ethers";
import { useState } from "react";
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { Loader } from "../components/Loader";
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
    <Box p="10">
      <Heading>Account {id}</Heading>
      <Text>{balance} ETH</Text>
    </Box>
  );
}
