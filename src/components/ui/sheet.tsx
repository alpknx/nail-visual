"use client";

import * as React from "react";
import { Panel, Page, Navbar, Block, Link } from "konsta/react";
import { cn } from "@/lib/utils";

// Shadcn Sheet is usually a side panel (right or left).
// Konsta Panel is a side panel (left or right).
// We need to map the API.

// Shadcn: Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter
// Konsta: Panel (opened, onBackdropClick, side)

interface SheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

const SheetContext = React.createContext<{
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}>({});

const Sheet = ({ open, onOpenChange, children }: SheetProps) => {
  return (
    <SheetContext.Provider value={{ open, onOpenChange }}>
      {children}
    </SheetContext.Provider>
  );
};

const SheetContent = ({
  side = "right",
  children,
  className
}: {
  side?: "left" | "right";
  children: React.ReactNode;
  className?: string
}) => {
  const { open, onOpenChange } = React.useContext(SheetContext);

  return (
    <Panel
      side={side}
      opened={open || false}
      onBackdropClick={() => onOpenChange?.(false)}
      className={cn("w-full sm:w-[400px]", className)} // Konsta Panel has default width but we can override
    >
      <Page className="bg-background">
        {/* We might need a Navbar here if we want a header, or just render children */}
        {children}
      </Page>
    </Panel>
  );
};

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-2 text-center sm:text-left p-4", className)} {...props} />
);

const SheetTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <div className={cn("text-lg font-semibold text-foreground", className)} {...props} />
);

const SheetDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <div className={cn("text-sm text-muted-foreground", className)} {...props} />
);

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 p-4", className)} {...props} />
);

export { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription };
