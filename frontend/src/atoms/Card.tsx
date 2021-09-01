import { Box, Button, Flex, Heading, HStack, HTMLChakraProps, Icon, Spacer, Text, Tooltip, useStyleConfig } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { VscChevronDown, VscChevronUp } from "react-icons/vsc";

interface CardProps extends HTMLChakraProps<"div"> {
  variant?: string
  title?: string
  subtitle?: string
  tooltip?: string
  collapsible?: boolean
  onCollapsed?: (collapsed: boolean) => void
}

function CardTooltip({ label }: { label: string }) {
  return <Box p={2}><Text>{label}</Text></Box>
}

export function Card(props: CardProps) {
  const { variant, children, title, collapsible, onCollapsed, subtitle, tooltip, ...rest } = props
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
        <Flex direction="column" alignItems="flex-start" gridGap={0} mb={collapsed ? 0 : 2}>
          <HStack w="100%">
            <HStack>
              {!tooltip && <Heading size="md" fontWeight="bold">{title}</Heading>}
              {tooltip && <Tooltip placement="right" label={<CardTooltip label={tooltip} />}><Text fontSize="md" fontWeight="bold">{title}</Text></Tooltip>}
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
          {subtitle && <Text mt={1} fontSize="xs" variant="brandSecondary">{subtitle}</Text>}
        </Flex>
      )}
      {(collapsible === undefined || !collapsed) && (
        <>{children}</>
      )}
    </Box>
  )
}
