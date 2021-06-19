import {
  Box,
  Heading,
  Table,
  Tbody,
  Tr,
  Td,
  Link,
  Code,
} from "@chakra-ui/react";
import { TransactionResponse } from "@ethersproject/abstract-provider";
import { utils } from "ethers";
import { useState } from "react";
import { useEffect } from "react";
import { Link as ReactLink, useParams } from "react-router-dom";
import { Loader } from "../components/Loader";
import { useEthereum } from "../contexts/EthereumContext";

export function EthTransactionDetail() {
  let { id } = useParams<{ id: string }>();
  const { eth } = useEthereum();
  const [transaction, setTransaction] = useState<TransactionResponse>();

  useEffect(() => {
    if (!eth) return;

    (async () => {
      setTransaction(await eth.getTransaction(id));
    })();
  }, [eth, id]);

  if (!transaction) {
    return <Loader>Loading transaction</Loader>;
  }

  return (
    <Box p="10">
      <Heading>Transaction {id}</Heading>
      <Table>
        <Tbody>
          <Tr>
            <Td>From</Td>
            <Td>
              <Link
                color="blue"
                to={`/account/${transaction.from}`}
                as={ReactLink}
              >
                {transaction.from}
              </Link>
            </Td>
          </Tr>
          <Tr>
            <Td>To</Td>
            <Td>
              <Link
                color="blue"
                to={`/account/${transaction.to}`}
                as={ReactLink}
              >
                {transaction.to}
              </Link>
            </Td>
          </Tr>
          <Tr>
            <Td>Confirmations</Td>
            <Td>{transaction.confirmations}</Td>
          </Tr>
          <Tr>
            <Td>Block Number</Td>
            <Td>
              <Link
                color="blue"
                to={`/block/${transaction.blockNumber}`}
                as={ReactLink}
              >
                {transaction.blockNumber}
              </Link>
            </Td>
          </Tr>
          <Tr>
            <Td>Gas Limit (Wei)</Td>
            <Td>{utils.formatUnits(transaction.gasLimit, "wei")}</Td>
          </Tr>
          <Tr>
            <Td>Gas Price (Wei)</Td>
            <Td>{utils.formatUnits(transaction.gasPrice, "wei")}</Td>
          </Tr>
          <Tr>
            <Td>Value (Wei)</Td>
            <Td>{utils.formatUnits(transaction.value, "wei")}</Td>
          </Tr>
          <Tr>
            <Td>Data</Td>
            <Td>
              <Code w="50vw">{transaction.data}</Code>
            </Td>
          </Tr>
          <Tr>
            <Td>s</Td>
            <Td>{transaction.s}</Td>
          </Tr>
          <Tr>
            <Td>r</Td>
            <Td>{transaction.r}</Td>
          </Tr>
          <Tr>
            <Td>v</Td>
            <Td>{transaction.v}</Td>
          </Tr>
          <Tr>
            <Td>Type</Td>
            <Td>{transaction.type}</Td>
          </Tr>
        </Tbody>
      </Table>
    </Box>
  );
}
