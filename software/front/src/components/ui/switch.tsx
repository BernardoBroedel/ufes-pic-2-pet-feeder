import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default"
}) {
  return (
      <SwitchPrimitive.Root
        data-slot="switch"
        data-size={size}
        className={cn(
          "peer group/switch relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-[24px] data-[size=default]:w-[44px] data-[size=sm]:h-[20px] data-[size=sm]:w-[36px]",
          className
        )}
        {...props}
      >
        <SwitchPrimitive.Thumb
          data-slot="switch-thumb"
          className="pointer-events-none block rounded-full bg-white shadow-sm ring-0 transition-transform group-data-[size=default]/switch:size-5 group-data-[size=sm]/switch:size-4 group-data-[state=checked]/switch:translate-x-5 group-data-[state=unchecked]/switch:translate-x-0.5"
        />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
