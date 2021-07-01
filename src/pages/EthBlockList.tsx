import {
  Table,
  Text,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  Link,
  HStack,
  Flex,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
} from "@chakra-ui/react";
import { Link as ReactLink } from "react-router-dom";
import { timeSince } from "../utils/time";
import { GasUsed } from "../components/GasUsed";
import {
  useBlockExplorer,
  BurnedBlockTransaction,
} from "../contexts/BlockExplorerContext";
import { Loader } from "../components/Loader";
import { BlockProgress } from "../components/BlockProgress";
import { Card } from "../components/Card";
import { FirePit } from "../components/FirePit";
import { BigNumberText } from "../components/BigNumberFormat";

const responsiveColumn = { display: ["none", "none", "table-cell"] };

interface EthBlockItemProps {
  block: BurnedBlockTransaction;
}

function EthBlockItem(props: EthBlockItemProps) {
  const { block } = props;
  return (
    <Tr>
      <Td>
        <Link
          color="brand.linkColor"
          to={`/block/${block.number}`}
          as={ReactLink}
        >
          {block.number}
        </Link>
      </Td>
      <Td whiteSpace="nowrap">{timeSince(block.timestamp as number)}</Td>
      <Td>{block.transactions.length}</Td>
      <Td>
        <GasUsed gasUsed={block.gasUsed} gasLimit={block.gasLimit} />
      </Td>
      <Td {...responsiveColumn}><BigNumberText number={block.gasLimit} /></Td>
      <Td><BigNumberText number={block.rewards} /></Td>
      <Td>
        <BigNumberText number={block.basefee} />
      </Td>
      <Td>
        <BigNumberText number={block.burned} />
      </Td>
    </Tr>
  );
}

export function EthBlockList() {
  const { details, blocks } = useBlockExplorer();

  if (!details) return <Loader>Loading block details ...</Loader>;

  if (!blocks) return <Loader>Loading blocks ...</Loader>;

  return (
    <Flex flex="1" direction="column" overflow="auto">
      <Breadcrumb
          mb="4"
          ml={["4", "4", "8"]}
          mr={["4", "4", "8"]}>
        <BreadcrumbItem fontSize="lg" fontWeight="bold">
          <BreadcrumbLink as={ReactLink} to="/blocks">
            Home
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>
          <Text>Blocks</Text>
        </BreadcrumbItem>
      </Breadcrumb>
      <Card 
          ml={["4", "4", "8"]}
          mr={["4", "4", "8"]}
          mb={["4", "4", "12"]}
          flex="1" overflow="auto">
        <Table colorScheme="whiteAlpha">
          <Thead>
            <Tr whiteSpace="nowrap">
              <Th color="brand.secondaryText">Block</Th>
              <Th color="brand.secondaryText">Age</Th>
              <Th color="brand.secondaryText">Txn</Th>
              <Th color="brand.secondaryText">Gas Used</Th>
              <Th color="brand.secondaryText" {...responsiveColumn}>
                Gas Limit
              </Th>
              <Th color="brand.secondaryText">Rewards</Th>
              <Th color="brand.secondaryText">
                Base Fee
              </Th>
              <Th color="brand.secondaryText">
                <HStack>
                  <FirePit size="12px" />
                  <Text>Burned</Text>
                </HStack>
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            <Tr whiteSpace="nowrap">
              <Td>{details.currentBlock + 1}</Td>
              <Td colSpan={7}>
                <BlockProgress />
              </Td>
            </Tr>
            {blocks.map((block, idx) => (
              <EthBlockItem
                key={idx}
                block={block}
              />
            ))}
          </Tbody>
        </Table>
      </Card>
    </Flex>
  );
}
