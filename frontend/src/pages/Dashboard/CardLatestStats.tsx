import { Text, HStack, VStack, Heading, ListItem, UnorderedList } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useBlockExplorer } from "../../contexts/BlockExplorerContext";
import { Card } from "../../atoms/Card";
import { BigNumberText } from "../../organisms/BigNumberText";
import { FirePit } from "../../atoms/FirePit";
import { OneEther } from "../../utils/number";

function RenderTooltip() {
  return (<>
    <Heading size="xs">Recent explainer</Heading>
    <UnorderedList mt={4} spacing={2}>
      <ListItem>
        Every block has a base fee, the minimum price per unit of gas for inclusion
        in this block, calculated by the network based on demand for block space. As
        the base fee of the transaction fee is burnt, users are also expected to set
        a tip (priority fee) in their transactions.
      </ListItem>
      <ListItem>
        With the new base fee getting burned, a priority fee (tip) is introduced to
        incentivize miners to include a transaction in the block. Without tips, miners
        would find it economically viable to mine empty blocks, as they would receive
        the same block reward. Under normal conditions, a small tip provides miners a
        minimal incentive to include a transaction. For transactions that need to get
        preferentially executed ahead of other transactions in the same block, a higher
        tip will be necessary to attempt to outbid competing transactions.
      </ListItem>
    </UnorderedList>
  </>)
}

export function CardLatestStats() {
  const { data: { details } } = useBlockExplorer();
  const [count, setCount] = useState<number | undefined>(details.clients);

  useEffect(() => {
    setCount(details.clients);
  }, [details.clients]);

  return (
    <Card title="Recent" subtitle="Latest block stats" tooltip={<RenderTooltip />}>
      <VStack align="flex-start" spacing={4}>
        <HStack w="100%">
          <Text flex={1} fontWeight="medium">Base Fee</Text>
          <BigNumberText number={details.currentBaseFee} textAlign="right" />
        </HStack>
        <HStack w="100%">
          <Text flex={1} fontWeight="medium">Priority Fee</Text>
          <BigNumberText number={details.currentPriorityFee} textAlign="right" />
        </HStack>
        <HStack w="100%">
          <Text flex={1} fontWeight="medium">Ethereum Price</Text>
          <BigNumberText number={OneEther} usdConversion={details.usdPrice} fontSize={16} textAlign="right" maximumFractionDigits={-1} />
        </HStack>
        <HStack w="100%">
          <HStack flex={1}><Text fontWeight="medium">Watching the Burn</Text> <FirePit size="12px" /></HStack>
          {count === undefined && <Text>calculating ...</Text>}
          {count !== undefined && <Text>{count} users</Text>}
        </HStack>
      </VStack>
    </Card>
  );
}
