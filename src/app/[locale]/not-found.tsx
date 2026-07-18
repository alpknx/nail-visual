"use client";

import { Page, Block, Button } from "konsta/react";
import Link from "next/link";

export default function LocaleNotFound() {
  return (
    <Page>
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
        <Block className="max-w-md w-full">
          <h1 className="text-2xl font-bold mb-2">Page not found</h1>
          <p className="text-muted-foreground mb-6">
            The page you&apos;re looking for doesn&apos;t exist or may have been moved.
          </p>
          <Link href="/">
            <Button>Back to home</Button>
          </Link>
        </Block>
      </div>
    </Page>
  );
}
