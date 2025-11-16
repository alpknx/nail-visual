"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from 'next-intl';
import Image from "next/image";
import { Heart } from "lucide-react";
import { useGeolocationContext } from "@/contexts/GeolocationContext";
import DesignFlipModal from "@/components/DesignFlipModal";
import { useState } from "react";
import type { Design } from "@/app/[locale]/designs/page";
import { getFavoritesFromStorage, removeFavoriteFromStorage } from "@/lib/localStorageFavorites";

export default function FavoritesPage() {
  const t = useTranslations('favorites');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const { detectedCity } = useGeolocationContext();
  const [selectedDesign, setSelectedDesign] = useState<Design | null>(null);

  // Загружаем ID избранных из localStorage
  const { data: favoriteIds = [], isLoading: idsLoading } = useQuery<string[]>({
    queryKey: ["favorites", "ids", "local"],
    queryFn: () => getFavoritesFromStorage(),
    staleTime: Infinity,
  });

  // Загружаем дизайны по ID из localStorage
  const { data: designs = [], isLoading: designsLoading } = useQuery<Design[]>({
    queryKey: ["favorites", "designs", favoriteIds.join(",")],
    queryFn: async () => {
      if (favoriteIds.length === 0) return [];
      // Загружаем дизайны по ID из API
      const allDesigns: Design[] = [];
      let offset = 0;
      const limit = 100;
      
      while (true) {
        const res = await fetch(`/api/designs?limit=${limit}&offset=${offset}`);
        if (!res.ok) break;
        const json = await res.json();
        const pageDesigns = json.data || [];
        if (pageDesigns.length === 0) break;
        allDesigns.push(...pageDesigns);
        offset += limit;
        if (pageDesigns.length < limit) break;
      }
      
      // Фильтруем только избранные
      return allDesigns.filter(d => favoriteIds.includes(d.id));
    },
    enabled: favoriteIds.length > 0,
  });

  const isLoading = idsLoading || designsLoading;

  const toggleFavorite = (designId: string) => {
    // Удаляем из localStorage
    removeFavoriteFromStorage(designId);
    
    // Обновляем кэш React Query
    const updated = favoriteIds.filter(id => id !== designId);
    queryClient.setQueryData<string[]>(["favorites", "ids", "local"], updated);
    queryClient.setQueryData<string[]>(["favorites", "ids", "home", "local"], updated);
    queryClient.setQueryData<string[]>(["favorites", "ids", "designs", "local"], updated);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="px-4 pt-16 md:pt-4">
          <h1 className="text-2xl font-semibold mb-2">{t('title') || 'Избранное'}</h1>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-lg border animate-pulse bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="px-4 pt-16 md:pt-4">
          <h1 className="text-2xl font-semibold mb-2">{t('title') || 'Избранное'}</h1>
          <p className="text-sm text-muted-foreground">
            {t('subtitle') || 'Ваши сохраненные дизайны'}
          </p>
        </div>

        {designs.length === 0 ? (
          <p className="text-center py-12 opacity-70 px-4">
            {t('empty') || 'У вас пока нет избранных дизайнов'}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 pb-4">
            {designs.map((design: Design, index: number) => (
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
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(design.id);
                  }}
                  className="absolute top-2 right-2 z-10 p-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                  aria-label="Remove from favorites"
                >
                  <Heart className="w-5 h-5 fill-current" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedDesign && (
        <DesignFlipModal
          design={selectedDesign}
          city={detectedCity || undefined}
          onClose={() => setSelectedDesign(null)}
          session={null}
          onSelectSimilar={(similarDesign) => {
            setSelectedDesign(similarDesign);
          }}
        />
      )}
    </>
  );
}

