"use client";

import * as React from "react";
import { ListInput } from "konsta/react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<typeof ListInput>
>(({ className, ...props }, ref) => {
  return (
    <div className={cn("w-full", className)}>
      <ListInput
        type="textarea"
        outline
        floatingLabel
        inputClassName="!h-auto" // Ensure textarea can grow or has height
        {...props}
      />
    </div>
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
