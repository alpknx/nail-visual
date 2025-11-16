"use client";

import { useState, useEffect, useRef } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from 'next-intl';
import { useGeolocationContext } from "@/contexts/GeolocationContext";
import { useSession } from "next-auth/react";
import { useRouter } from "@/i18n/routing";
import Image from "next/image";
import { Heart } from "lucide-react";
import DesignFlipModal from "@/components/DesignFlipModal";
import type { Design } from "@/app/[locale]/designs/page";

export default function DesignsGrid() {
  const t = useTranslations('designs');
  const tCommon = useTranslations('common');
  const { detectedCity } = useGeolocationContext();
  const { data: session } = useSession();
  const router = useRouter();
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

  // Загружаем избранное для текущего пользователя
  const { data: favoriteIds = [] } = useQuery<string[]>({
    queryKey: ["favorites", "ids", "home"],
    queryFn: async () => {
      if (!session?.user?.id || designs.length === 0) return [];
      const designIds = designs.map(d => d.id).join(",");
      const res = await fetch(`/api/favorites/check?designIds=${designIds}`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
    enabled: !!session?.user?.id && designs.length > 0,
  });

  const toggleFavorite = async (designId: string, isFavorite: boolean) => {
    if (!session) {
      // Можно показать toast с предложением войти
      return;
    }

    // Оптимистичное обновление UI
    const queryKey = ["favorites", "ids", "home"];
    queryClient.setQueryData<string[]>(queryKey, (old = []) => {
      if (isFavorite) {
        return old.filter(id => id !== designId);
      } else {
        return [...old, designId];
      }
    });

    try {
      if (isFavorite) {
        await fetch(`/api/favorites?designId=${designId}`, { method: "DELETE" });
      } else {
        await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ designId }),
        });
      }
      // Обновляем кэш избранного
      await queryClient.invalidateQueries({ queryKey: ["favorites"] });
    } catch (error) {
      // В случае ошибки откатываем оптимистичное обновление
      await queryClient.invalidateQueries({ queryKey: ["favorites"] });
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
              {/* Кнопка Like */}
              {session && (
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
                  )}
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
        />
      )}
    </>
  );
}

