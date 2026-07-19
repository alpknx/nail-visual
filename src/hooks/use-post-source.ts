import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Detects whether a post is being viewed in "portfolio mode" (i.e. navigated to
 * from a master's profile page) using several signals for reliability across
 * browsers, especially mobile Safari where useSearchParams can lag behind the
 * actual URL on first render.
 */
export function usePostSource(source: string | undefined) {
  const searchParams = useSearchParams();

  // Check source from multiple sources for maximum reliability
  const sourceFromUrl = searchParams.get('source');
  const sourceFromWindow = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('source')
    : null;

  // Also check referrer and sessionStorage to detect if coming from master profile page (synchronous check)
  const checkSourceFromReferrer = () => {
    if (typeof window === 'undefined') return null;

    // First check sessionStorage (most reliable for mobile Safari)
    try {
      const storedSource = sessionStorage.getItem('postSource');
      if (storedSource === 'profile') {
        return 'profile';
      }
    } catch (e) {
      // sessionStorage might not be available
    }

    // Also check if referrer contains master profile path
    try {
      const referrer = document.referrer;
      if (referrer && (referrer.includes('/master/') || referrer.includes('/profile'))) {
        return 'profile';
      }
    } catch (e) {
      // referrer might not be available
    }

    return null;
  };

  const sourceFromReferrer = checkSourceFromReferrer();
  const effectiveSource = source || sourceFromUrl || sourceFromWindow || sourceFromReferrer;
  const isPortfolioMode = Boolean(effectiveSource === 'profile');

  // Force portfolio mode if we have the flag - this is critical for mobile Safari
  // Double-check sessionStorage directly as a fallback (synchronous check)
  // Also check URL path to see if we're coming from master page
  // This MUST be synchronous and happen during render, not in useEffect
  const finalIsPortfolioMode = (() => {
    // First check if we already determined portfolio mode
    if (isPortfolioMode) return true;

    // On server, return false (will be checked on client)
    if (typeof window === 'undefined') return false;

    try {
      // Check sessionStorage FIRST (most reliable for mobile Safari)
      const storedSource = sessionStorage.getItem('postSource');
      if (storedSource === 'profile') {
        return true;
      }

      // Also check referrer more aggressively
      const referrer = document.referrer || '';
      if (referrer.includes('/master/') || referrer.includes('/profile')) {
        return true;
      }

      return false;
    } catch (e) {
      // If sessionStorage is not available, fall back to referrer check
      try {
        const referrer = document.referrer || '';
        return referrer.includes('/master/') || referrer.includes('/profile');
      } catch {
        return false;
      }
    }
  })();

  // Clear sessionStorage after reading to avoid stale data
  useEffect(() => {
    if (typeof window !== 'undefined' && sourceFromReferrer === 'profile') {
      // Don't clear immediately - keep it for potential back navigation
      // sessionStorage.removeItem('postSource');
    }
  }, [sourceFromReferrer]);

  return {
    sourceFromUrl,
    sourceFromWindow,
    sourceFromReferrer,
    effectiveSource,
    isPortfolioMode,
    finalIsPortfolioMode,
  };
}
