import { useSearchParams } from "next/navigation";

/**
 * Detects whether a post is being viewed in "portfolio mode" (i.e. navigated
 * to from a master's profile page), purely from the `source=profile` URL
 * query param.
 *
 * Deliberately does NOT use document.referrer or sessionStorage as a
 * fallback signal, despite an earlier version doing so: both are "sticky"
 * across an entire browser tab/SPA session in ways that don't match the
 * intended per-navigation semantics. document.referrer only updates on a
 * hard/full page load, not on Next.js client-side <Link> transitions - so
 * landing on one post via a hard link from a master profile (referrer =
 * profile URL) would incorrectly flag EVERY post viewed afterward via
 * client-side navigation, for the rest of that session, as "portfolio
 * mode" too. sessionStorage had the same class of bug (a one-shot flag
 * that leaked forward once set and never correctly reset). The `source`
 * search param, by contrast, is naturally re-evaluated by Next.js per
 * navigation with no staleness risk.
 */
export function usePostSource(source: string | undefined) {
  const searchParams = useSearchParams();

  const sourceFromUrl = searchParams.get('source');
  const sourceFromWindow = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('source')
    : null;

  const effectiveSource = source || sourceFromUrl || sourceFromWindow;
  const isPortfolioMode = Boolean(effectiveSource === 'profile');

  return {
    sourceFromUrl,
    sourceFromWindow,
    effectiveSource,
    isPortfolioMode,
    finalIsPortfolioMode: isPortfolioMode,
  };
}
