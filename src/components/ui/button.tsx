"use client";

import * as React from "react";
import { Button as KonstaButton } from "konsta/react";
import { cn } from "@/lib/utils";

// Mapping Shadcn variants to Konsta props/styles
// Konsta Button props: outline, clear, rounded, small, large, etc.

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof KonstaButton> & {
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    size?: "default" | "sm" | "lg" | "icon";
    asChild?: boolean; // Konsta doesn't support asChild directly in the same way, but we can try to adapt or ignore
  }
>(({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {

  // Map variants to Konsta props
  const isOutline = variant === "outline";
  const isClear = variant === "ghost" || variant === "link";
  const isDestructive = variant === "destructive";
  const isSecondary = variant === "secondary";

  // Map sizes
  const isSmall = size === "sm";
  const isLarge = size === "lg";

  // Custom styles for variants not directly supported by Konsta props
  const customClass = cn(
    className,
    isDestructive && "k-color-red", // Example for destructive
    variant === "link" && "underline",
    size === "icon" && "w-10 h-10 p-0 flex items-center justify-center rounded-full" // Icon button style
  );

  return (
    <KonstaButton
      ref={ref}
      outline={isOutline}
      clear={isClear}
      small={isSmall}
      large={isLarge}
      rounded={true} // Default to rounded for modern look
      className={customClass}
      {...props}
    />
  );
});
Button.displayName = "Button";

export { Button };
