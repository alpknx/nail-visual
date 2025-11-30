"use client";

import * as React from "react";
import { Badge as KonstaBadge } from "konsta/react";
import { cn } from "@/lib/utils";

const Badge = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof KonstaBadge> & {
    variant?: "default" | "secondary" | "destructive" | "outline";
  }
>(({ className, variant = "default", ...props }, ref) => {

  // Map variants to Konsta colors or styles
  // Konsta Badge has `colors` prop usually

  const customClass = cn(
    className,
    variant === "secondary" && "k-color-gray", // Example
    variant === "destructive" && "k-color-red",
    variant === "outline" && "border border-current bg-transparent" // Manual outline style
  );

  return (
    <KonstaBadge
      ref={ref}
      className={customClass}
      {...props}
    />
  );
});
Badge.displayName = "Badge";

export { Badge };
