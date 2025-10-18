"use client";
import posthog from "posthog-js";

let inited = false;

export function initPostHog() {
    if (inited || typeof window === "undefined") return;

    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return; // нет ключа — выходим тихо

    posthog.init(key, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
        autocapture: true,
        capture_pageview: false, // если сам отправляешь $pageview через хук
        // persistence: "localStorage", // опционально, по умолчанию ok
    });

    inited = true;
}

export function identifyUser(id: string, props?: Record<string, unknown>) {
    if (!inited) initPostHog();
    if (id) posthog.identify(id, props);
}

export function resetPostHog() {
    if (inited) posthog.reset();
}

export { posthog };
