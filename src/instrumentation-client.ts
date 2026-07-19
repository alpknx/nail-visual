// Sentry client-side (browser) initialization.
// Runs in the browser to capture unhandled exceptions, promise rejections,
// and client-side performance/session-replay data.
//
// No-ops gracefully when NEXT_PUBLIC_SENTRY_DSN is unset (e.g. local dev,
// or environments without a configured Sentry project) — Sentry.init()
// with an empty dsn simply disables the SDK instead of throwing.
//
// See: https://docs.sentry.io/platforms/javascript/guides/nextjs/
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only send events when a DSN is actually configured.
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for finer control.
  tracesSampleRate: 1,

  // Enable logs to be sent to Sentry.
  enableLogs: true,

  // Set to true for verbose Sentry SDK debugging during development.
  debug: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
