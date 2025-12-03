"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function MasterProfileContext() {
  const pathname = usePathname();
  
  // Set context IMMEDIATELY when master profile page loads (synchronously)
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem('postSource', 'profile');
    } catch (e) {
      // sessionStorage might not be available
    }
  }
  
  // Also set it in useEffect as backup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('postSource', 'profile');
      } catch (e) {
        // sessionStorage might not be available
      }
    }
  }, [pathname]);

  return null;
}

