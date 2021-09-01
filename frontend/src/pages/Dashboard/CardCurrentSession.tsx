import { Text, HStack, Divider } from "@chakra-ui/react";
import { useBlockExplorer } from "../../contexts/BlockExplorerContext";
import { Card } from "../../atoms/Card";
import { BigNumberText } from "../../organisms/BigNumberText";
import { timeSince } from "../../utils/time";
import { useSettings } from "../../contexts/SettingsContext";
import { Setting } from "../../config";
import { useEffect, useState } from "react";

export function CardCurrentSession() {
  const { data: { session } } = useBlockExplorer();
  const settings = useSettings();
  const [doNotShowCurrentSession, setDoNotShowCurrentSession] = useState<boolean>(
    settings.get(Setting.doNotShowCurrentSession)
  );

  useEffect(() => {
    settings.set(Setting.doNotShowCurrentSession, doNotShowCurrentSession);
  }, [settings, doNotShowCurrentSession]);

  const since = {
    fullText: new Intl.DateTimeFormat(navigator.language, { dateStyle: 'long', timeStyle: 'long' }).format(session.since),
    timeAgo: timeSince(session.since / 1000)
  };

  const amount = 1
  return (
    <Card
      title="Current Session"
      collapsible={doNotShowCurrentSession}
      onCollapsed={(collapsed) => setDoNotShowCurrentSession(collapsed)}
    >
      <HStack>
        <Text flex={1}>Burned</Text>
        <BigNumberText number={session.burned} usdConversion={amount} fontSize={16} maximumFractionDigits={2} />
      </HStack>
      <HStack>
        <Text flex={1}>Rewards</Text>
        <BigNumberText number={session.rewards} usdConversion={amount} fontSize={16} maximumFractionDigits={2} />
      </HStack>
      <HStack>
        <Text flex={1}>Tips</Text>
        <BigNumberText number={session.tips} usdConversion={amount} fontSize={16} maximumFractionDigits={2} />
      </HStack>
      <HStack>
        <HStack flex={1}><Text>Base Fee</Text><Text fontSize={12} variant="brandSecondary">(min/max)</Text></HStack>
        <BigNumberText number={session.minBaseFee} fontSize={16} hideCurrency />
        <Text>/</Text>
        <BigNumberText number={session.maxBaseFee} fontSize={16} />
      </HStack>
      <Divider />
      <HStack>
        <Text flex={1}>Since</Text>
        <Text fontSize={16} title={since.fullText}>{since.timeAgo}</Text>
        <Text fontSize={16} variant="brandSecondary">({session.blockCount} blocks)</Text>
      </HStack>
    </Card>
  );
}
