"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from 'next-intl';
import { useSession } from "next-auth/react";
import Image from "next/image";
import { Heart } from "lucide-react";
import { useGeolocationContext } from "@/contexts/GeolocationContext";
import DesignFlipModal from "@/components/DesignFlipModal";
import { useState } from "react";
import type { Design } from "@/app/[locale]/designs/page";

export default function FavoritesPage() {
  const t = useTranslations('favorites');
  const tCommon = useTranslations('common');
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { detectedCity } = useGeolocationContext();
  const [selectedDesign, setSelectedDesign] = useState<Design | null>(null);

  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ["favorites"],
    queryFn: async () => {
      const res = await fetch("/api/favorites");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
    enabled: !!session?.user?.id,
  });

  const toggleFavorite = async (designId: string) => {
    // Оптимистичное обновление UI - удаляем дизайн из списка сразу
    queryClient.setQueryData<any[]>(["favorites"], (old = []) => {
      return old.filter((f: any) => f.design?.id !== designId);
    });

    // Также обновляем кэш избранных ID
    queryClient.setQueryData<string[]>(["favorites", "ids"], (old = []) => {
      return old.filter(id => id !== designId);
    });
    queryClient.setQueryData<string[]>(["favorites", "ids", "home"], (old = []) => {
      return old.filter(id => id !== designId);
    });

    try {
      await fetch(`/api/favorites?designId=${designId}`, { method: "DELETE" });
      // Обновляем кэш избранного
      await queryClient.invalidateQueries({ queryKey: ["favorites"] });
    } catch (error) {
      // В случае ошибки откатываем оптимистичное обновление
      await queryClient.invalidateQueries({ queryKey: ["favorites"] });
    }
  };

  if (!session) {
    return (
      <div className="space-y-4 px-4 pt-16 md:pt-4">
        <h1 className="text-2xl font-semibold mb-2">{t('title') || 'Избранное'}</h1>
        <p className="text-center py-12 opacity-70">
          {t('needAuth') || tCommon('needAuth') || 'Необходимо войти в систему'}
        </p>
      </div>
    );
  }

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

  const designs = favorites.map((f: any) => f.design);

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
          session={session}
        />
      )}
    </>
  );
}

