import { Button, forwardRef, HTMLChakraProps, Icon } from "@chakra-ui/react";
import { SiEthereum } from "react-icons/si";
import { VscSettingsGear } from "react-icons/vsc";
import { useNavigate } from "react-router-dom";
import { useEthereum } from "../contexts/EthereumContext";

export const EthereumNetworkBadge = forwardRef<HTMLChakraProps<"button">, "button">(
    (props: HTMLChakraProps<"button">, ref: React.ForwardedRef<any>) => {
  const navigate = useNavigate()
  const { eth } = useEthereum();
  
  const name = eth?.connectedNetwork.name || 'Connecting to network...'
  return (
    <Button
      colorScheme="orange"
      variant="solid"
      size="xs"
      leftIcon={<Icon as={SiEthereum} />}
      rightIcon={<Icon as={VscSettingsGear} />}
      title="Change network"
      onClick={() => navigate('/settings')}
      {...props}
    >
      {name}
    </Button>
  );
});
