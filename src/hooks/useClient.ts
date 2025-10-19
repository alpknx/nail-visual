import { useState, useEffect } from "react";

/**
 * Custom hook to handle client-side only rendering
 * Prevents hydration mismatches by deferring conditional renders until after client hydration
 *
 * Usage:
 * const mounted = useClient();
 * {mounted && <ConditionalComponent />}
 */
export function useClient(): boolean {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}
