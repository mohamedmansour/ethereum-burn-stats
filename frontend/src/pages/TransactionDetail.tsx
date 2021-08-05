import {
  Table,
  Tbody,
  Tr,
  Td,
  Link,
  Code,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Text,
  Flex,
} from "@chakra-ui/react";
import { useState } from "react";
import { useEffect } from "react";
import { Link as ReactLink, useParams } from "react-router-dom";
import { BigNumberText } from "../organisms/BigNumberText";
import { Card } from "../atoms/Card";
import { Loader } from "../organisms/Loader";
import { Transaction, useEthereum } from "../contexts/EthereumContext";
import { layoutConfig } from "../layoutConfig";

export function EthTransactionDetail() {
  let { id } = useParams<{ id: string }>();
  const { eth } = useEthereum();
  const [transaction, setTransaction] = useState<Transaction>();

  useEffect(() => {
    if (!eth) return;

    (async () => {
      setTransaction(await eth.getTransaction(id));
    })();
  }, [eth, id]);

  if (!transaction) {
    return <Loader>loading transaction</Loader>;
  }

  return (
    <Flex flex="1" direction="column" m={layoutConfig.gap} gridGap={layoutConfig.gap}>
      <Breadcrumb>
        <BreadcrumbItem fontSize="lg" fontWeight="bold">
          <BreadcrumbLink as={ReactLink} to="/blocks">
            Home
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>
          <Text>Transaction</Text>
        </BreadcrumbItem>
      </Breadcrumb>
      <Card flex="1" w="100%">
        <Table colorScheme="whiteAlpha">
          <Tbody>
            <Tr>
              <Td color="brand.secondaryText">Id:</Td>
              <Td>{id}</Td>
            </Tr>
            <Tr>
              <Td color="brand.secondaryText">From</Td>
              <Td isTruncated>
                <Link
                  to={`/account/${transaction.from}`}
                  as={ReactLink}
                >
                  {transaction.from}
                </Link>
              </Td>
            </Tr>
            <Tr>
              <Td color="brand.secondaryText">To</Td>
              <Td>
                <Link
                  to={`/account/${transaction.to}`}
                  as={ReactLink}
                >
                  {transaction.to}
                </Link>
              </Td>
            </Tr>
            <Tr>
              <Td color="brand.secondaryText">Confs</Td>
              <Td>{transaction.confirmations}</Td>
            </Tr>
            <Tr>
              <Td color="brand.secondaryText">Block Number</Td>
              <Td>
                <Link
                  to={`/block/${transaction.blockNumber}`}
                  as={ReactLink}
                >
                  {transaction.blockNumber}
                </Link>
              </Td>
            </Tr>
            <Tr>
              <Td color="brand.secondaryText">Gas Limit</Td>
              <Td><BigNumberText number={transaction.gas} /></Td>
            </Tr>
            <Tr>
              <Td color="brand.secondaryText">Gas Price</Td>
              <Td><BigNumberText number={transaction.gasPrice} /></Td>
            </Tr>
            <Tr>
              <Td color="brand.secondaryText">Value</Td>
              <Td>{transaction.value}</Td>
            </Tr>
            <Tr>
              <Td color="brand.secondaryText">Data</Td>
              <Td>
                <Code w="50vw">{transaction.input}</Code>
              </Td>
            </Tr>
            <Tr>
              <Td color="brand.secondaryText">s</Td>
              <Td wordBreak="break-all">{transaction.s}</Td>
            </Tr>
            <Tr>
              <Td color="brand.secondaryText">r</Td>
              <Td>{transaction.r}</Td>
            </Tr>
            <Tr>
              <Td color="brand.secondaryText">v</Td>
              <Td>{transaction.v}</Td>
            </Tr>
            <Tr>
              <Td color="brand.secondaryText">Type</Td>
              <Td>{transaction.type}</Td>
            </Tr>
          </Tbody>
        </Table>
      </Card>
    </Flex>
  );
}
