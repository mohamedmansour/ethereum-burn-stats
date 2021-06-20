import {
  Table,
  Text,
  Tbody,
  Thead,
  Tr,
  Th,
  Td,
  Link,
  VStack,
} from "@chakra-ui/react";
import { BlockWithTransactions } from "@ethersproject/abstract-provider";
import { utils } from "ethers";
import { useState } from "react";
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { Loader } from "../components/Loader";
import { useEthereum } from "../contexts/EthereumContext";
import { Setting } from "../contexts/SettingsContext";
import { useSetting } from "../hooks/useSetting";
import { Link as ReactLink } from "react-router-dom";
import { Card } from "../components/Card";
import { PageTitle } from "../components/PageTitle";

export function EthBlockDetail() {
  let { id } = useParams<{ id: string }>();
  const { eth } = useEthereum();
  const [block, setBlock] = useState<BlockWithTransactions>();
  const formatBurnInGwei = useSetting<boolean>(Setting.formatBurnInGwei);

  useEffect(() => {
    if (!eth) return;

    (async () => {
      setBlock(await eth.getBlockWithTransactions(parseInt(id)));
    })();
  }, [eth, id]);

  if (!block) {
    return <Loader>Loading transactions for block</Loader>;
  }

  return (
    <VStack overflow="hidden" m="4" mt="0" align="flex-start" h="100%">
      <PageTitle title="Block" subtitle={"#" + id} />
      <Card overflow="auto" flex="1" w="100%">
        {block.transactions.length === 0 && <Text>No Transactions</Text>}
        {block.transactions.length !== 0 && (
          <Table w="100%">
            <Thead>
              <Tr whiteSpace="nowrap">
                <Th>Confirmations</Th>
                <Th>Tx</Th>
                <Th>Value</Th>
                <Th>Gas Price</Th>
              </Tr>
            </Thead>
            <Tbody>
              {block.transactions.map((t, idx) => (
                <Tr whiteSpace="nowrap" key={idx}>
                  <Td>{t.confirmations}</Td>
                  <Td>
                    <Link
                      color="blue"
                      to={`/transaction/${t.hash}`}
                      as={ReactLink}
                    >
                      {t.hash}
                    </Link>
                  </Td>
                  <Td>{utils.formatEther(t.value)} Ether</Td>
                  <Td>
                    {utils.formatUnits(
                      t.gasPrice,
                      formatBurnInGwei ? "gwei" : "wei"
                    )}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Card>
    </VStack>
  );
}
