import {
  Tbody,
  Tr,
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
import { useEthereum } from "../contexts/EthereumContext";
import { Transaction } from "../libs/ethereum";
import { layoutConfig } from "../layoutConfig";
import { TablePlus, TdPlus } from "../atoms/TablePlus";

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
      <Card flex="1" w="100%" position="relative" overflow="auto">
        <TablePlus>
          <Tbody>
            <Tr>
              <TdPlus variant='brandSecondary'>Id:</TdPlus>
              <TdPlus>{id}</TdPlus>
            </Tr>
            <Tr>
              <TdPlus variant='brandSecondary'>From</TdPlus>
              <TdPlus isTruncated>
                <Link
                  to={`/account/${transaction.from}`}
                  as={ReactLink}
                >
                  {transaction.from}
                </Link>
              </TdPlus>
            </Tr>
            <Tr>
              <TdPlus variant='brandSecondary'>To</TdPlus>
              <TdPlus>
                <Link
                  to={`/account/${transaction.to}`}
                  as={ReactLink}
                >
                  {transaction.to}
                </Link>
              </TdPlus>
            </Tr>
            <Tr>
              <TdPlus variant='brandSecondary'>Confs</TdPlus>
              <TdPlus>{transaction.confirmations}</TdPlus>
            </Tr>
            <Tr>
              <TdPlus variant='brandSecondary'>Block Number</TdPlus>
              <TdPlus>
                <Link
                  to={`/block/${transaction.blockNumber}`}
                  as={ReactLink}
                >
                  {transaction.blockNumber}
                </Link>
              </TdPlus>
            </Tr>
            <Tr>
              <TdPlus variant='brandSecondary'>Gas Limit</TdPlus>
              <TdPlus><BigNumberText number={transaction.gas} /></TdPlus>
            </Tr>
            <Tr>
              <TdPlus variant='brandSecondary'>Gas Price</TdPlus>
              <TdPlus><BigNumberText number={transaction.gasPrice} /></TdPlus>
            </Tr>
            <Tr>
              <TdPlus variant='brandSecondary'>Value</TdPlus>
              <TdPlus>{transaction.value}</TdPlus>
            </Tr>
            <Tr>
              <TdPlus variant='brandSecondary'>Data</TdPlus>
              <TdPlus>
                <Code w="50vw">{transaction.input}</Code>
              </TdPlus>
            </Tr>
            <Tr>
              <TdPlus variant='brandSecondary'>s</TdPlus>
              <TdPlus wordBreak="break-all">{transaction.s}</TdPlus>
            </Tr>
            <Tr>
              <TdPlus variant='brandSecondary'>r</TdPlus>
              <TdPlus>{transaction.r}</TdPlus>
            </Tr>
            <Tr>
              <TdPlus variant='brandSecondary'>v</TdPlus>
              <TdPlus>{transaction.v}</TdPlus>
            </Tr>
            <Tr>
              <TdPlus variant='brandSecondary'>Type</TdPlus>
              <TdPlus>{transaction.type}</TdPlus>
            </Tr>
          </Tbody>
        </TablePlus>
      </Card>
    </Flex>
  );
}
