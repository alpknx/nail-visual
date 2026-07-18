import { headers } from "next/headers";

// Extract locale from referer URL (e.g., http://localhost:3000/en/onboarding -> en)
export async function getLocaleFromHeaders(): Promise<string> {
  const headersList = await headers();
  const referer = headersList.get("referer") || "";
  const localeMatch = referer.match(/\/(en|pl|ru)(?:\/|$)/);
  return localeMatch ? localeMatch[1] : "en";
}
