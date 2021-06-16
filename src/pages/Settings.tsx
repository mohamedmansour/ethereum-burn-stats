import { Popover, PopoverTrigger, Portal, PopoverContent, PopoverArrow, PopoverHeader, PopoverCloseButton, PopoverBody, Button, useDisclosure, FormControl, Checkbox } from "@chakra-ui/react";
import { useRef } from "react";
import { VscSettingsGear } from "react-icons/vsc";
import { Setting, useSettings } from "../contexts/SettingsContext";

export function Settings() {
  const { onOpen, onClose, isOpen } = useDisclosure()
  const firstFieldRef = useRef(null)
  const settings = useSettings()
  
  return (
    <Popover
      isOpen={isOpen}
      initialFocusRef={firstFieldRef}
      onOpen={onOpen}
      onClose={onClose}
      placement="bottom"
      closeOnBlur={true}>
      <PopoverTrigger>
        <Button colorScheme="blue" variant="ghost"><VscSettingsGear cursor="pointer" /></Button>
      </PopoverTrigger>
      <Portal>
        <PopoverContent>
          <PopoverArrow />
          <PopoverHeader>Settings</PopoverHeader>
          <PopoverCloseButton />
          <PopoverBody>
            <FormControl>
              <Checkbox defaultIsChecked={settings.get(Setting.autoFormatBurn)} id="setting-checkbox" ref={firstFieldRef} onChange={(e) => settings.set(Setting.autoFormatBurn, e.target.checked)}>Auto format burn value</Checkbox>
            </FormControl>
          </PopoverBody>
        </PopoverContent>
      </Portal>
    </Popover>
  )
}