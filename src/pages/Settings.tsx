import {
  Checkbox,
  Box,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Heading,
  HStack,
  Radio,
  RadioGroup,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Text,
  Flex,
} from "@chakra-ui/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link as ReactLink } from "react-router-dom";
import { Card } from "../components/Card";
import { Setting } from "../config";
import { useSettings } from "../contexts/SettingsContext";
import { debounce } from "../utils/debounce";

export function Settings() {
  const firstFieldRef = useRef(null);
  const settings = useSettings();
  const [maxBlocks, setMaxBlocks] = useState<number>(
    settings.get(Setting.maxBlocksToRender)
  );

  useEffect(() => {
    settings.set(Setting.maxBlocksToRender, maxBlocks);
  }, [settings, maxBlocks]);

  const changeHandler = (value: number) => {
    if (value > 0) setMaxBlocks(value);
  };

  const debouncedChangeHandler = useMemo(
    () => debounce(changeHandler, 300),
    []
  );

  return (
    <Flex flex="1" m={8} mt={0} direction="column" gridGap={8}>
      <Breadcrumb>
        <BreadcrumbItem fontSize="lg" fontWeight="bold">
          <BreadcrumbLink as={ReactLink} to="/blocks">
            Home
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>
          <Text>Settings</Text>
        </BreadcrumbItem>
      </Breadcrumb>
      <Box w="100%">
        <Heading size="sm" color="brand.secondaryText">
          Ethereum Network
        </Heading>
        <Card mt="2">
          <RadioGroup
            onChange={(e) => settings.set(Setting.network, e)}
            defaultValue={settings.get(Setting.network)}
            ref={firstFieldRef}
          >
            <HStack>
              <Radio value="calaveras">Calaveras (devnet)</Radio>
              <Radio value="ropsten" isDisabled>
                Ropsten (testnet)
              </Radio>
              <Radio value="goerli" isDisabled>
                Goerli (testnet)
              </Radio>
              <Radio value="rinkeby" isDisabled>
                Rinkeby (testnet)
              </Radio>
              <Radio value="mainnet" isDisabled>
                Mainnet
              </Radio>
            </HStack>
          </RadioGroup>
        </Card>
      </Box>

      <Box w="100%">
        <Heading size="sm" color="brand.secondaryText">
          Gwei or Wei
        </Heading>
        <Card mt="2">
          <Checkbox
            colorScheme="red"
            defaultIsChecked={settings.get(Setting.formatBurnInGwei)}
            onChange={(e) =>
              settings.set(Setting.formatBurnInGwei, e.target.checked)
            }
          >
            Format Burned in Gwei
          </Checkbox>
          <Checkbox
            colorScheme="red"
            defaultIsChecked={settings.get(Setting.formatBaseFeeInGwei)}
            onChange={(e) =>
              settings.set(Setting.formatBaseFeeInGwei, e.target.checked)
            }
          >
            Format Base Fee in Gwei
          </Checkbox>
        </Card>
      </Box>

      <Box w="100%">
        <Heading size="sm" color="brand.secondaryText">
          Max Blocks to Render ({maxBlocks} blocks)
        </Heading>
        <Card mt="2">
          <Slider
            min={0}
            defaultValue={maxBlocks}
            max={50}
            step={5}
            onChangeEnd={debouncedChangeHandler}
          >
            <SliderTrack bg="red.100">
              <Box position="relative" right={10} />
              <SliderFilledTrack bg="orangered" />
            </SliderTrack>
            <SliderThumb boxSize={6} />
          </Slider>
        </Card>
      </Box>
    </Flex>
  );
}
