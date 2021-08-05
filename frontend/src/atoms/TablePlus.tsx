// Allows injecting variants so we can have custom tables such as sticky column headers.

import { Table, TableCellProps, TableColumnHeaderProps, TableProps, Td, Th, useStyleConfig } from "@chakra-ui/react"

interface TablePlusProps extends TableProps {
  variant?: 'sticky'
}

export function TablePlus(props: TablePlusProps) {
  const { variant, children, ...rest } = props
  const styles = useStyleConfig("TablePlus", { variant }) as any
  return <Table {...styles} {...rest}>{children}</Table>
}

interface ThPlusProps extends TableColumnHeaderProps {
  variant?: 'sticky'
}

export function ThPlus(props: ThPlusProps) {
  const { variant, children, ...rest } = props
  const styles = useStyleConfig("ThPlus", { variant }) as any
  return <Th {...styles} {...rest}>{children}</Th>
}

interface TdPlusProps extends TableCellProps {
  variant?: 'sticky'
}

export function TdPlus(props: TdPlusProps) {
  const { variant, children, ...rest } = props
  const styles = useStyleConfig("TdPlus", { variant }) as any
  return <Td {...styles} {...rest}>{children}</Td>
}
