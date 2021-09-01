import { Text, HStack, VStack } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useBlockExplorer } from "../../contexts/BlockExplorerContext";
import { Card } from "../../atoms/Card";
import { BigNumberText } from "../../organisms/BigNumberText";
import { FirePit } from "../../atoms/FirePit";
import { OneEther } from "../../utils/number";

export function CardLatestStats() {
  const { data: { details } } = useBlockExplorer();
  const [count, setCount] = useState<number | undefined>(details.clients);

  useEffect(() => {
    setCount(details.clients);
  }, [details.clients]);

  return (
    <Card
      title="Recent"
      subtitle="Latest block stats">
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
          <HStack flex={1}><Text fontWeight="medium">Watching the Burn</Text> <FirePit size="12px" /></HStack>
          {count === undefined && <Text>calculating ...</Text>}
          {count !== undefined && <Text>{count} users</Text>}
        </HStack>
        <HStack w="100%">
          <Text flex={1} fontWeight="medium">Ethereum Price</Text>
          <BigNumberText number={OneEther} usdConversion={details.usdPrice} fontSize={16} textAlign="right" maximumFractionDigits={-1} />
        </HStack>
      </VStack>
    </Card>
  );
}
