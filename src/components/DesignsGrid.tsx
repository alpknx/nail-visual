"use client";

import { useState, useEffect, useRef } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from 'next-intl';
import { useGeolocationContext } from "@/contexts/GeolocationContext";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { Heart } from "lucide-react";
import DesignFlipModal from "@/components/DesignFlipModal";
import type { Design } from "@/app/[locale]/designs/page";
import { addFavoriteToStorage, removeFavoriteFromStorage } from "@/lib/localStorageFavorites";

export default function DesignsGrid() {
  const t = useTranslations('designs');
  const tCommon = useTranslations('common');
  const { detectedCity } = useGeolocationContext();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [selectedDesign, setSelectedDesign] = useState<Design | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const limit = 20; // Количество дизайнов за раз

  // Загружаем дизайны с infinite scroll
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["designs", "home", "infinite"],
    queryFn: async ({ pageParam = 0 }) => {
      const url = new URL("/api/designs", window.location.origin);
      url.searchParams.set("limit", String(limit));
      url.searchParams.set("offset", String(pageParam));
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to fetch designs");
      const json = await res.json();
      return json.data || [];
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === limit ? allPages.length * limit : undefined;
    },
    initialPageParam: 0,
  });

  // Убираем дубликаты по ID из всех страниц
  const allDesigns = data?.pages.flat() || [];
  const seenIds = new Set<string>();
  const designs = allDesigns.filter(design => {
    if (seenIds.has(design.id)) return false;
    seenIds.add(design.id);
    return true;
  });

  // Intersection Observer для автоматической загрузки при скролле
  useEffect(() => {
    if (!loadMoreRef.current || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchNextPage();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Загружаем избранное из localStorage
  const { data: favoriteIds = [] } = useQuery<string[]>({
    queryKey: ["favorites", "ids", "home", "local"],
    queryFn: () => {
      if (typeof window === "undefined") return [];
      try {
        const stored = localStorage.getItem("saved_designs_v1");
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    },
    staleTime: Infinity, // localStorage не меняется через API
  });

  const toggleFavorite = (designId: string, isFavorite: boolean) => {
    // Обновляем localStorage
    if (typeof window === "undefined") return;
    
    try {
      const stored = localStorage.getItem("saved_designs_v1");
      const favorites = stored ? JSON.parse(stored) : [];
      
      let updated: string[];
      if (isFavorite) {
        updated = favorites.filter((id: string) => id !== designId);
      } else {
        if (!favorites.includes(designId)) {
          updated = [...favorites, designId];
        } else {
          updated = favorites;
        }
      }
      
      localStorage.setItem("saved_designs_v1", JSON.stringify(updated));
      
      // Обновляем кэш React Query
      queryClient.setQueryData<string[]>(["favorites", "ids", "home", "local"], updated);
      queryClient.setQueryData<string[]>(["favorites", "ids", "designs", "local"], updated);
    } catch (error) {
      console.error("Error updating favorites:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-[3/4] rounded-lg border animate-pulse bg-muted" />
        ))}
      </div>
    );
  }

  if (designs.length === 0) {
    return (
      <div className="px-4">
        <p className="text-center py-12 opacity-70">
          {t('noDesigns') || 'Дизайны не найдены'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 pb-4">
        {designs.map((design, index) => {
          const isFavorite = favoriteIds.includes(design.id);
          return (
            <div
              key={design.id}
              className="relative aspect-[3/4] rounded-lg overflow-hidden group cursor-pointer border"
              onClick={() => setSelectedDesign(design)}
            >
                  <Image
                src={design.imageUrl}
                alt={design.description || "Nail design"}
                fill
                sizes="50vw"
                className="object-cover"
                priority={index < 4}
                loading={index < 4 ? "eager" : "lazy"}
              />
              {/* Кнопка Like - доступна для всех */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(design.id, isFavorite);
                }}
                className={`absolute top-2 right-2 z-10 p-2 rounded-full transition-colors ${
                  isFavorite
                    ? "bg-red-500 text-white"
                    : "bg-white/80 text-gray-600 hover:bg-white"
                }`}
                aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? "fill-current" : ""}`} />
              </button>
            </div>
          );
        })}
        
        {/* Элемент для отслеживания скролла */}
        {hasNextPage && (
          <div ref={loadMoreRef} className="col-span-2 h-20 flex items-center justify-center">
            {isFetchingNextPage && (
              <div className="text-sm text-muted-foreground">Загрузка...</div>
            )}
          </div>
        )}
      </div>

      {/* Модальное окно с дизайном и matching */}
      {selectedDesign && (
        <DesignFlipModal
          design={selectedDesign}
          city={detectedCity || undefined}
          onClose={() => setSelectedDesign(null)}
          session={session}
          onSelectSimilar={(similarDesign) => {
            setSelectedDesign(similarDesign);
          }}
        />
      )}
    </>
  );
}

