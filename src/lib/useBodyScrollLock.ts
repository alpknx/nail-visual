"use client";

import { useEffect } from "react";

// Module-level counter shared by every caller. Needed because multiple
// modals can be mounted at once (e.g. MasterMatchDialog with a BookingModal
// opened on top of it) - each locks scroll independently, but a naive
// `overflow = ""` cleanup on unmount would clear the lock still held by an
// outer modal that's still open. Reference-counting makes nested locks
// compose correctly: scroll is only restored once nothing is holding a lock.
let lockCount = 0;

export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;

    lockCount += 1;
    document.body.style.overflow = "hidden";

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.body.style.overflow = "";
      }
    };
  }, [active]);
}
