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

  const uniqueId = useMemo(() => {++id; return id;}, [])

  return (
    <Icon viewBox="0 0 32 32" {...rest}>
      <ellipse cx="16" cy="21.766" rx="10.2342" ry="10.2342" fill={`url(#circle_gradient_${uniqueId})`} />
      <path d="M23.2367 0L8.7633 14.4987C4.76659 18.5023 4.76659 24.9936 8.7633 28.9972L23.2367 14.4986C27.2334 10.4949 27.2334 4.00366 23.2367 0Z" fill={`url(#flame_gradient_${uniqueId})`} />
      <defs>
        <linearGradient id={`circle_gradient_${uniqueId}`} x1="24.3797" y1="13.2922" x2="8.94395" y2="29.0511" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FAB951" />
          <stop offset="1" stopColor="#FF5F52" />
        </linearGradient>
        <linearGradient id={`flame_gradient_${uniqueId}`} x1="16" y1="0" x2="16" y2="28.9972" gradientUnits="userSpaceOnUse">
          <stop stopColor="#C62828" />
          <stop offset="1" stopColor="#FF5F52" />
        </linearGradient>
      </defs>
    </Icon>
  )
}
