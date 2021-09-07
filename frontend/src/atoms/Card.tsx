import { Box, Button, Flex, Heading, HStack, HTMLChakraProps, Icon, LightMode, Spacer, Text, Tooltip, useStyleConfig } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { VscChevronDown, VscChevronUp } from "react-icons/vsc";
import { MdInfoOutline } from "react-icons/md";

interface CardProps extends HTMLChakraProps<"div"> {
  variant?: string
  title?: string
  subtitle?: string
  tooltip?: React.ReactNode
  isCollapsible?: boolean
  isTransparent?: boolean
  onCollapsed?: (collapsed: boolean) => void
}

function CardTooltip({ label }: { label: React.ReactNode }) {
  return <Box p={2}><LightMode>{label}</LightMode></Box>
}

export function Card(props: CardProps) {
  const { variant, children, title, isTransparent, isCollapsible, onCollapsed, subtitle, tooltip, ...rest } = props
  const styles = useStyleConfig("Card", { variant, isTransparent })

  const [collapsed, setCollapsed] = useState<boolean | undefined>(isCollapsible);

  const onCollapsedClicked = () => {
    const newCollapsed = !collapsed;
    setCollapsed(newCollapsed)
    if (onCollapsed)
      onCollapsed(newCollapsed);
  }

  useEffect(() => {
    setCollapsed(isCollapsible)
  }, [isCollapsible])

  if (tooltip && isCollapsible) {
    throw new Error("Collapsible cards cannot have tooltips")
  }

  return (
    <Box __css={styles} {...rest}>
      {title && (
        <Flex direction="column" alignItems="flex-start" gridGap={0} mb={collapsed ? 0 : 2}>
          <HStack w="100%">
            <Heading size="md" fontWeight="bold">{title}</Heading>
            {isCollapsible !== undefined && (
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
            {tooltip && (
              <>
                <Tooltip placement="right" label={<CardTooltip label={tooltip} />}><Box position="relative"><Icon as={MdInfoOutline} /></Box></Tooltip>
              </>
            )}
          </HStack>
          {subtitle && <Text mt={1} fontSize="xs" variant="brandSecondary">{subtitle}</Text>}
        </Flex>
      )}
      {(isCollapsible === undefined || !collapsed) && (
        <>{children}</>
      )}
    </Box>
  )
}
