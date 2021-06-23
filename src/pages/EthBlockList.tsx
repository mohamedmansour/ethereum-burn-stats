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
import { utils } from "ethers";
import { Link as ReactLink } from "react-router-dom";
import { useSetting } from "../hooks/useSetting";
import { timeSince } from "../utils/time";
import { GasUsed } from "../components/GasUsed";
import { formatBigNumber, formatCurrency } from "../utils/wei";
import {
  useBlockExplorer,
  BurnedBlockTransaction,
} from "../contexts/BlockExplorerContext";
import { Loader } from "../components/Loader";
import { BlockProgress } from "../components/BlockProgress";
import { Card } from "../components/Card";
import { Setting } from "../config";
import { FirePit } from "../components/FirePit";

const responsiveColumn = { display: ["none", "none", "table-cell"] };

interface EthBlockItemProps {
  block: BurnedBlockTransaction;
  formatBurnInGwei: boolean;
  formatBaseFeeInGwei: boolean;
  formatGasInGwei: boolean;
}

function EthBlockItem(props: EthBlockItemProps) {
  const { block, formatBurnInGwei, formatBaseFeeInGwei, formatGasInGwei } = props;
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
      <Td {...responsiveColumn}>{formatBigNumber(block.gasLimit, formatGasInGwei)}</Td>
      <Td>{utils.formatUnits(block.rewards, 'ether')}</Td>
      <Td>
        {formatBigNumber(block.basefee, formatBaseFeeInGwei)}
      </Td>
      <Td>
        {formatBigNumber(block.burned, formatBurnInGwei)}
      </Td>
    </Tr>
  );
}

export function EthBlockList() {
  const { details, blocks } = useBlockExplorer();
  const formatBurnInGwei = useSetting<boolean>(Setting.formatBurnInGwei);
  const formatBaseFeeInGwei = useSetting<boolean>(Setting.formatBaseFeeInGwei);
  const formatGasInGwei = useSetting<boolean>(Setting.formatGasInGwei);

  if (!details) return <Loader>Loading block details ...</Loader>;

  if (!blocks) return <Loader>Loading blocks ...</Loader>;

  const latestBlock = blocks[0];
  return (
    <Flex flex="1" direction="column" overflow="auto">
      <Breadcrumb>
        <BreadcrumbItem fontSize="lg" fontWeight="bold">
          <BreadcrumbLink as={ReactLink} to="/blocks">
            Home
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>
          <Text>Blocks</Text>
        </BreadcrumbItem>
      </Breadcrumb>
      <Card mt={4} flex="1" overflow="auto">
        <Table colorScheme="whiteAlpha">
          <Thead>
            <Tr whiteSpace="nowrap">
              <Th color="brand.secondaryText">Block</Th>
              <Th color="brand.secondaryText">Age</Th>
              <Th color="brand.secondaryText">Txn</Th>
              <Th color="brand.secondaryText">Gas Used</Th>
              <Th color="brand.secondaryText" {...responsiveColumn}>
                Gas Limit ({formatCurrency(formatGasInGwei)})
              </Th>
              <Th color="brand.secondaryText">Rewards (eth)</Th>
              <Th color="brand.secondaryText">
                Base Fee ({formatCurrency(formatBaseFeeInGwei)})
              </Th>
              <Th color="brand.secondaryText">
                <HStack>
                  <FirePit size="12px" />
                  <Text>Burned ({formatCurrency(formatBurnInGwei)})</Text>
                </HStack>
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            <Tr whiteSpace="nowrap">
              <Td>{details.currentBlock + 1}</Td>
              <Td colSpan={7}>
                <BlockProgress totalSecondsPerBlock={30} block={latestBlock} />
              </Td>
            </Tr>
            {blocks.map((block, idx) => (
              <EthBlockItem
                key={idx}
                block={block}
                formatBurnInGwei={formatBurnInGwei}
                formatBaseFeeInGwei={formatBaseFeeInGwei}
                formatGasInGwei={formatGasInGwei}
              />
            ))}
          </Tbody>
        </Table>
      </Card>
    </Flex>
  );
}
