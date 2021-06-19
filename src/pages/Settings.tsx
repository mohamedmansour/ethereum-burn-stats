import {
  Popover,
  PopoverTrigger,
  Portal,
  PopoverContent,
  PopoverArrow,
  PopoverHeader,
  PopoverCloseButton,
  PopoverBody,
  Button,
  useDisclosure,
  FormControl,
  FormLabel,
  Checkbox,
  Box,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
} from "@chakra-ui/react";
import { useEffect, useMemo } from "react";
import { useRef, useState } from "react";
import { VscSettingsGear } from "react-icons/vsc";
import { Setting, useSettings } from "../contexts/SettingsContext";
import { debounce } from "../utils/debounce";

export function Settings() {
  const { onOpen, onClose, isOpen } = useDisclosure();
  const firstFieldRef = useRef(null);
  const settings = useSettings();
  const [maxBlocks, setMaxBlocks] = useState<number>(settings.get(Setting.maxBlocksToRender))

  useEffect(() => {
    settings.set(Setting.maxBlocksToRender, maxBlocks)
  }, [settings, maxBlocks])

  const changeHandler = (value: number) => {
    setMaxBlocks(value)
  }

  const debouncedChangeHandler = useMemo(() => debounce(changeHandler, 300), [])

  return (
    <Popover
      isOpen={isOpen}
      initialFocusRef={firstFieldRef}
      onOpen={onOpen}
      onClose={onClose}
      placement="bottom"
      closeOnBlur={true}
    >
      <PopoverTrigger>
        <Button colorScheme="white" variant="ghost">
          <VscSettingsGear cursor="pointer" />
        </Button>
      </PopoverTrigger>
      <Portal>
        <PopoverContent
          color="white"
          bg="gray.700"
          borderColor="white"
          boxShadow="lg"
        >
          <PopoverArrow bg="gray.700" />
          <PopoverHeader pt={4} fontWeight="bold" border="0">
            Settings
          </PopoverHeader>
          <PopoverCloseButton />
          <PopoverBody>
            <FormControl as="fieldset">
              <FormLabel as="legend">Gwei or Wei</FormLabel>
              <Checkbox
                colorScheme="red"
                defaultIsChecked={settings.get(Setting.formatBurnInGwei)}
                ref={firstFieldRef}
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
            </FormControl>

            <FormControl as="fieldset" mt="5">
              <FormLabel as="legend">Max Blocks to Render ({maxBlocks} blocks)</FormLabel>
              <Slider min={0} defaultValue={maxBlocks} max={100} step={10}  onChangeEnd={debouncedChangeHandler}>
                <SliderTrack bg="red.100">
                  <Box position="relative" right={10} />
                  <SliderFilledTrack bg="tomato" />
                </SliderTrack>
                <SliderThumb boxSize={6} />
              </Slider>
            </FormControl>
          </PopoverBody>
        </PopoverContent>
      </Portal>
    </Popover>
  );
}
