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
  Checkbox,
} from "@chakra-ui/react";
import { useRef } from "react";
import { VscSettingsGear } from "react-icons/vsc";
import { Setting, useSettings } from "../contexts/SettingsContext";

export function Settings() {
  const { onOpen, onClose, isOpen } = useDisclosure();
  const firstFieldRef = useRef(null);
  const settings = useSettings();

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
            <FormControl>
              <Checkbox
                colorScheme="gray"
                defaultIsChecked={settings.get(Setting.formatBurnInGwei)}
                id="setting-checkbox"
                ref={firstFieldRef}
                onChange={(e) =>
                  settings.set(Setting.formatBurnInGwei, e.target.checked)
                }
              >
                Format Burned in GWEI
              </Checkbox>
            </FormControl>

            <FormControl>
              <Checkbox
                colorScheme="gray"
                defaultIsChecked={settings.get(Setting.formatBaseFeeInGwei)}
                id="setting-checkbox"
                ref={firstFieldRef}
                onChange={(e) =>
                  settings.set(Setting.formatBaseFeeInGwei, e.target.checked)
                }
              >
                Format Base Fee in GWEI
              </Checkbox>
            </FormControl>
          </PopoverBody>
        </PopoverContent>
      </Portal>
    </Popover>
  );
}
