"use client";

import * as React from "react";
import { ListInput } from "konsta/react";
import { cn } from "@/lib/utils";

// Konsta ListInput is usually used within a List, but can be used standalone or we wrap it.
// Shadcn Input is a simple <input> wrapper.
// To maintain compatibility, we might need to wrap ListInput or use a custom styled input using Konsta classes if available.
// However, Konsta's ListInput provides the "mobile" feel (floating labels, etc.).

// Let's try to adapt ListInput to behave somewhat like the previous Input, 
// or accept that the look will change significantly (which is the goal).

const Input = React.forwardRef<
  HTMLInputElement,
  any // Bypass strict type check for now to allow Konsta props like 'after', 'media'
>(({ className, type, ...props }, ref) => {
  return (
    <div className={cn("w-full", className)}>
      <ListInput
        // ref={ref} // ListInput ref might not be directly forwarded to the input element in the same way
        type={type}
        outline
        floatingLabel // Enable floating label for that mobile feel
        {...props}
      />
    </div>
  );
});
Input.displayName = "Input";

export { Input };
