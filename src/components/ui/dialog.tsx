"use client";

import * as React from "react";
import { Dialog as KonstaDialog, DialogButton } from "konsta/react";
import { cn } from "@/lib/utils";

// Shadcn Dialog is complex (Trigger, Content, Header, etc.)
// Konsta Dialog is simpler (opened prop, title, buttons)
// We need to adapt the API or refactor usages.
// Given the instruction to "completely replace", we should probably expose the Konsta API 
// but we might need to keep some wrapper to avoid rewriting every usage immediately if possible,
// OR we rewrite the usages.
// Let's try to keep the exports but map them to Konsta logic where possible, 
// or just export a simplified Dialog that uses Konsta.

// Since Shadcn uses Context for open state (DialogTrigger), and Konsta uses props (opened),
// we can't easily map 1:1 without a state wrapper.

// For now, let's export a simplified wrapper that matches the *usage* in MasterMatchDialog
// MasterMatchDialog uses: Dialog, DialogContent, DialogHeader, DialogTitle
// It controls state via `open` and `onOpenChange` props on the root Dialog.

interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

const Dialog = ({ open, onOpenChange, children }: DialogProps) => {
  // We need to pass open/onOpenChange down to the Content
  // This is a bit hacky, but we can use Context or cloneElement
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
};

const DialogContext = React.createContext<{
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}>({});

const DialogContent = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  const { open, onOpenChange } = React.useContext(DialogContext);

  // Konsta Dialog expects title, buttons, etc. as props, or children.
  // But Konsta Dialog renders into a portal usually.

  return (
    <KonstaDialog
      opened={open || false}
      onBackdropClick={() => onOpenChange?.(false)}
      className={className}
    >
      {children}
    </KonstaDialog>
  );
};

// Konsta Dialog doesn't have a separate Header/Title component structure in the same way,
// but we can just render them as divs inside the children.

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
);

const DialogTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <div className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
);

export { Dialog, DialogContent, DialogHeader, DialogTitle };
