"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

export function usePrefetchPro() {
  const queryClient = useQueryClient();

  const prefetch = useCallback(
    (proId: string) => {
      // Prefetch профиль мастера
      queryClient.prefetchQuery({
        queryKey: ["pro", proId],
        queryFn: async () => {
          const res = await fetch(`/api/pros/${proId}`);
          if (!res.ok) throw new Error("Failed to fetch pro");
          return res.json();
        },
        staleTime: 5 * 60 * 1000, // 5 мин
      });

      // Prefetch работы мастера
      queryClient.prefetchQuery({
        queryKey: ["works", "by-pro", proId],
        queryFn: async () => {
          const res = await fetch(`/api/works?proId=${proId}`);
          if (!res.ok) throw new Error("Failed to fetch works");
          const data = await res.json();
          return data.data;
        },
        staleTime: 5 * 60 * 1000,
      });
    },
    [queryClient]
  );

  return { prefetch };
}
