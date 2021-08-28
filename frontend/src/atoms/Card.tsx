import { Box, Button, Divider, HStack, HTMLChakraProps, Icon, Spacer, Text, Tooltip, useStyleConfig } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { IconType } from "react-icons"
import { VscChevronDown, VscChevronUp } from "react-icons/vsc";

interface CardProps extends HTMLChakraProps<"div"> {
  variant?: string
  title?: string
  tooltip?: string
  icon?: IconType
  collapsible?: boolean
  onCollapsed?: (collapsed: boolean) => void
}

function CardTooltip({label}: {label: string}) {
  return <Box p={2}><Text>{label}</Text></Box>
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

  useEffect(() => {
    setCollapsed(collapsible)
  }, [collapsible])
  
  return (
    <Box __css={styles} {...rest}>
      {title && (
        <>
        <HStack>
          {icon && <Icon as={icon} />}
          <HStack>
          {!props.tooltip && <Text fontSize="md" fontWeight="bold">{title}</Text>}
          {props.tooltip && <Tooltip placement="right" label={<CardTooltip label={props.tooltip} />}><Text fontSize="md" fontWeight="bold">{title}</Text></Tooltip>}
          </HStack>
          {collapsible !== undefined && (
            <>
              <Spacer />
              <Button 
                  title={collapsed ? `Show ${title}` : `Hide ${title}`}
                  variant="ghost" 
                  size="sm" 
                  leftIcon={<Icon as={collapsed ? VscChevronDown : VscChevronUp} />} 
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
