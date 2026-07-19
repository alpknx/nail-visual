"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Page, Block, Button } from "konsta/react";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <Page>
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
        <Block className="max-w-md w-full">
          <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
          <p className="text-muted-foreground mb-6">
            An unexpected error occurred. You can try again, or head back to the home page.
          </p>
          <div className="flex flex-col gap-3">
            <Button onClick={() => reset()}>Try again</Button>
            <Button clear onClick={() => (window.location.href = "/")}>
              Back to home
            </Button>
          </div>
        </Block>
      </div>
    </Page>
  );
}
