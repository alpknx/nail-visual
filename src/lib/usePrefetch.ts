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

export function usePrefetchReference() {
  const queryClient = useQueryClient();

  const prefetch = useCallback(
    (refId: string) => {
      queryClient.prefetchQuery({
        queryKey: ["reference", refId],
        queryFn: async () => {
          const res = await fetch(`/api/references/${refId}`);
          if (!res.ok) throw new Error("Failed to fetch reference");
          return res.json();
        },
        staleTime: 5 * 60 * 1000,
      });

      // Также загружаем офферы
      queryClient.prefetchQuery({
        queryKey: ["offers", "by-ref", refId],
        queryFn: async () => {
          const res = await fetch(`/api/offers?referenceId=${refId}`);
          if (!res.ok) throw new Error("Failed to fetch offers");
          const data = await res.json();
          return data.data;
        },
        staleTime: 2 * 60 * 1000,
      });
    },
    [queryClient]
  );

  return { prefetch };
}
