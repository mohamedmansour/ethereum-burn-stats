import { Text, HStack } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { FaGlasses } from 'react-icons/fa';
import { BlockExplorerDetails } from "../../contexts/BlockExplorerContext";
import { Card } from "../../atoms/Card";
import { BigNumberText } from "../../organisms/BigNumberText";
import { FirePit } from "../../atoms/FirePit";

export function CardLatestStats({ details, clients }: { details: BlockExplorerDetails; clients: number | undefined }) {
  const [count, setCount] = useState<number | undefined>(clients);

  useEffect(() => {
    if (!clients) {
      return;
    }

    setCount(clients);
  }, [clients]);

  return (
    <Card 
        title="Latest Stats"
        icon={FaGlasses}>
      <HStack>
        <Text flex={1}>Base Fee</Text>
        <BigNumberText number={details.currentBaseFee} fontSize={16} textAlign="right" />
      </HStack>
      <HStack>
        <HStack flex={1}><Text>Watching the Burn</Text> <FirePit size="12px" /></HStack>
        {count === undefined && <Text>calculating ...</Text>}
        {count !== undefined && <Text>{count} users</Text>}
      </HStack>
    </Card>
  );
}
