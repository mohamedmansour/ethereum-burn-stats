import { Box, Button, Divider, HStack, HTMLChakraProps, Icon, Spacer, Text, useStyleConfig } from "@chakra-ui/react";
import { useState } from "react";
import { IconType } from "react-icons"
import { VscChevronDown, VscChevronUp } from "react-icons/vsc";

interface CardProps extends HTMLChakraProps<"div"> {
  variant?: string
  title?: string
  icon?: IconType
  collapsible?: boolean
  onCollapsed?: (collapsed: boolean) => void
}

export function Card(props: CardProps) {
  const { variant, children, title, icon, collapsible, onCollapsed, ...rest } = props
  const styles = useStyleConfig("Card", { variant })

  const [collapsed, setCollapsed] = useState<boolean | undefined>(collapsible);

  const onCollapsedClicked = () => {
    const newCollapsed = !collapsed;
    setCollapsed(newCollapsed)
    if (onCollapsed) 
      onCollapsed(newCollapsed);
  }
  
  return (
    <Box __css={styles} {...rest}>
      {title && (
        <>
        <HStack>
          {icon && <Icon as={icon} />}
          <Text fontSize="md" fontWeight="bold">
            {title}
          </Text>
          {collapsible !== undefined && (
            <>
              <Spacer />
              <Button 
                  title={collapsed ? `Show ${title}` : `Hide ${title}`}
                  variant="ghost" 
                  size="sm" 
                  leftIcon={<Icon as={collapsed ? VscChevronDown : VscChevronUp} />} 
                  _hover={{ bg: '#333' }} 
                  _active={{ bg: '#222' }} 
                  iconSpacing={0} 
                  onClick={onCollapsedClicked}>
              </Button>
            </>
          )}
        </HStack>
        {(collapsible === undefined || !collapsed) && (
          <Divider />
        )}
        </>
      )}
      {(collapsible === undefined || !collapsed) && (
        <>{children}</>
      )}
    </Box>
  )
}