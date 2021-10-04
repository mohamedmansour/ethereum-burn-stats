import { Icon, IconProps } from "@chakra-ui/react";
import { useMemo } from "react";

let id = 0

export interface LogoIconProps extends IconProps {
  animate?: boolean
}

export function LogoIcon(props: LogoIconProps) {
  let {
    animate,
    ...rest
  } = props;

  const uniqueId = useMemo(() => { ++id; return id; }, [])

  return (
    <Icon viewBox="0 0 32 32" {...rest}>
      <path d="M15.5 31a9.5 9.5 0 1 0 0-19 9.5 9.5 0 0 0 0 19Z" fill={`url(#circle_gradient_${uniqueId})`} />
      <path d="M22.2 1 8.8 14.6a9.5 9.5 0 0 0 0 13.4l13.4-13.4a9.6 9.6 0 0 0 0-13.6Z" fill={`url(#flame_gradient_${uniqueId})`} />
      <defs>
        <linearGradient id={`circle_gradient_${uniqueId}`} x1="23.3" x2="8.9" y1="13.6" y2="28.3" gradientUnits="userSpaceOnUse">
          <stop stop-color="#FAB951" />
          <stop offset="1" stop-color="#FF5F52" />
        </linearGradient>
        <linearGradient id={`flame_gradient_${uniqueId}`} x1="15.5" x2="15.5" y1="1" y2="28" gradientUnits="userSpaceOnUse">
          <stop stop-color="#C62828" />
          <stop offset="1" stop-color="#FF5F52" />
        </linearGradient>
      </defs>
    </Icon>
  )
}
