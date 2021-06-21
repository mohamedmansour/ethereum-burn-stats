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
import { formatWei } from "../utils/wei";
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
}

function EthBlockItem(props: EthBlockItemProps) {
  const { block, formatBurnInGwei, formatBaseFeeInGwei } = props;
  const weiBurnedFormatted = formatWei(block.weiBurned, formatBurnInGwei);
  const weiBaseFeeFormatted = formatWei(block.weiBaseFee, formatBaseFeeInGwei);

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
      <Td {...responsiveColumn}>{utils.commify(block.gasLimit.toNumber())}</Td>
      <Td>{block.ethRewards}</Td>
      <Td title={`${utils.commify(block.weiBaseFee)} wei`}>
        {weiBaseFeeFormatted}
      </Td>
      <Td title={`${utils.commify(block.weiBurned)} wei`}>
        {weiBurnedFormatted}
      </Td>
    </Tr>
  );
}

export function EthBlockList() {
  const { details, blocks } = useBlockExplorer();
  const formatBurnInGwei = useSetting<boolean>(Setting.formatBurnInGwei);
  const formatBaseFeeInGwei = useSetting<boolean>(Setting.formatBaseFeeInGwei);

  if (!details) return <Loader>Loading block details ...</Loader>;

  if (!blocks) return <Loader>Loading blocks ...</Loader>;

  const latestBlock = blocks[0];
  return (
    <Flex flex="1" m={8} mt={0} direction="column">
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
                Gas Limit
              </Th>
              <Th color="brand.secondaryText">Rewards (ETH)</Th>
              <Th color="brand.secondaryText">
                Base Fee ({formatBaseFeeInGwei ? "Gwei" : "Wei"})
              </Th>
              <Th color="brand.secondaryText">
                <HStack>
                  <FirePit size="12px" />
                  <Text>Burned ({formatBurnInGwei ? "Gwei" : "Wei"})</Text>
                </HStack>
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            <Tr whiteSpace="nowrap">
              <Td>{details.currentBlock + 1}</Td>
              <Td colSpan={7}>
                <BlockProgress
                  totalSecondsPerBlock={30}
                  block={latestBlock}
                  colorScheme="red"
                  bg="brand.background"
                  isAnimated
                  hasStripe={true}
                  rounded="full"
                />
              </Td>
            </Tr>
            {blocks.map((block, idx) => (
              <EthBlockItem
                key={idx}
                block={block}
                formatBurnInGwei={formatBurnInGwei}
                formatBaseFeeInGwei={formatBaseFeeInGwei}
              />
            ))}
          </Tbody>
        </Table>
      </Card>
    </Flex>
  );
}
