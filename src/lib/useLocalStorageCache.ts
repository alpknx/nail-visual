"use client";

import { useEffect, useState } from "react";

const CACHE_PREFIX = "nail_visual_cache_";
const CACHE_TTL = 5 * 60 * 1000; // 5 мин

type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

export function useLocalStorageCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl = CACHE_TTL
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const cacheKey = CACHE_PREFIX + key;

    // Пытаемся загрузить из localStorage
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const entry = JSON.parse(cached) as CacheEntry<T>;
        const isExpired = Date.now() - entry.timestamp > ttl;

        if (!isExpired) {
          // Кэш валиден — показываем его сразу
          setData(entry.data);
          setIsLoading(false);

          // Но обновляем фоном
          fetchFn()
            .then((freshData) => {
              setData(freshData);
              localStorage.setItem(
                cacheKey,
                JSON.stringify({ data: freshData, timestamp: Date.now() })
              );
            })
            .catch(() => {
              // Ошибка при фоновом обновлении — оставляем старые данные
            });
          return;
        }
      }
    } catch {
      // localStorage недоступен или parsing ошибка
    }

    // Кэша нет или он истёк — загружаем свежие данные
    fetchFn()
      .then((freshData) => {
        setData(freshData);
        try {
          localStorage.setItem(
            cacheKey,
            JSON.stringify({ data: freshData, timestamp: Date.now() })
          );
        } catch {
          // localStorage может быть заполнен
        }
      })
      .catch(() => {
        setData(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [key, fetchFn, ttl]);

  return { data, isLoading };
}
