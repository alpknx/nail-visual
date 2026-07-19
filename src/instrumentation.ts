// Sentry server + edge runtime initialization, wired through Next.js's
// `instrumentation.ts` convention (stable since Next.js 15).
//
// `register()` runs once when the server process boots; we branch on
// NEXT_RUNTIME to load the correct Sentry config for the Node.js server
// runtime vs the Edge runtime (used by middleware.ts).
//
// `onRequestError` is Next.js's hook for reporting errors from API routes,
// Server Components, Server Actions, and Route Handlers - Sentry's
// `captureRequestError` forwards them to Sentry automatically.
//
// Both branches no-op gracefully when SENTRY_DSN is unset: Sentry.init()
// with an empty dsn disables the SDK instead of throwing, so this is safe
// to ship without a configured Sentry project.
//
// See: https://docs.sentry.io/platforms/javascript/guides/nextjs/

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const Sentry = await import("@sentry/nextjs");

    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      enabled: !!process.env.SENTRY_DSN,
      tracesSampleRate: 1,
      enableLogs: true,
      debug: false,
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    const Sentry = await import("@sentry/nextjs");

    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      enabled: !!process.env.SENTRY_DSN,
      tracesSampleRate: 1,
      enableLogs: true,
      debug: false,
    });
  }
}

export async function onRequestError(
  ...args: Parameters<
    typeof import("@sentry/nextjs").captureRequestError
  >
) {
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(...args);
}
