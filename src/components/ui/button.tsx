"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-xl border border-transparent bg-clip-padding text-sm font-bold whitespace-nowrap transition-all duration-300 outline-none select-none focus-visible:ring-4 focus-visible:ring-primary/20 active:scale-95 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:brightness-110",
        outline:
          "border-border bg-secondary backdrop-blur-md text-foreground hover:bg-secondary/50 hover:border-border",
        secondary:
          "bg-card text-foreground hover:bg-accent",
        ghost:
          "text-muted-foreground hover:bg-secondary hover:text-foreground",
        destructive:
          "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-6 gap-2 glove:h-14 glove:px-8",
        xs: "h-8 px-3 text-xs gap-1.5 glove:min-h-12 glove:min-w-12 glove:text-sm",
        sm: "h-9 px-4 text-xs gap-1.5 glove:min-h-12 glove:min-w-12 glove:text-sm",
        lg: "h-12 px-8 text-base gap-2.5 glove:h-16 glove:px-10 glove:text-lg",
        icon: "size-11 glove:size-14",
        "icon-xs": "size-8 glove:size-11",
        "icon-sm": "size-9 glove:size-12",
        "icon-lg": "size-12 glove:size-16",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
