"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from 'next-intl';
import Image from "next/image";
import FlipModal from "@/components/FlipModal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import CitySelect from "@/components/CitySelect";
import TagPicker from "@/components/TagPicker";
import { listReferences, createReference, type City, type Tag, type ClientReference } from "@/lib/api";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/routing";
import { Heart } from "lucide-react";

export default function ClientReferenceGallery() {
  const t = useTranslations('references.gallery');
  const tCommon = useTranslations('common');
  const { data: session } = useSession();
  const router = useRouter();
  const [selectedRef, setSelectedRef] = useState<ClientReference | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    note: "",
    tags: [] as Tag[],
    city: undefined as City | undefined,
  });

  // Загрузить все референсы
  const { data: references = [], isLoading } = useQuery({
    queryKey: ["references"],
    queryFn: () => listReferences({ limit: 100 }),
  });

  const handleOpenModal = (ref: ClientReference) => {
    setSelectedRef(ref);
    setFormData({
      note: ref.note || "",
      tags: (ref.tags as Tag[]) || [],
      city: ref.city,
    });
  };

  const handleCloseModal = () => {
    setSelectedRef(null);
  };

  const handleSubmit = async () => {
    if (!selectedRef || !formData.city || formData.tags.length === 0) {
      toast.error(t('fillCityAndTags'));
      return;
    }

    if (!session) {
      toast.error(tCommon('needAuth'));
      router.push("/signin");
      return;
    }

    setIsSubmitting(true);
    try {
      await createReference({
        imageUrl: selectedRef.imageUrl,
        city: formData.city,
        tags: formData.tags,
        note: formData.note || undefined,
      });
      toast.success(t('created'));
      setSelectedRef(null);
      // Обновить список
      window.location.reload();
    } catch (error) {
      toast.error(t('error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-[3/4] rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 pb-4">
        {references.map((ref: ClientReference, index: number) => (
          <div
            key={ref.id}
            className="relative aspect-[3/4] rounded-lg overflow-hidden group cursor-pointer"
            onClick={() => handleOpenModal(ref)}
          >
            <Image
              src={ref.imageUrl}
              alt={ref.note || tCommon('reference')}
              fill
              sizes="50vw"
              className="object-cover"
              priority={index < 2}
            />
            {/* Кнопка ХОЧУ */}
            <button
              className="absolute top-2 right-2 z-10 p-2 rounded-full bg-primary/90 text-primary-foreground hover:bg-primary transition-colors shadow-lg"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenModal(ref);
              }}
              aria-label={t('want')}
            >
              <Heart className="w-5 h-5 fill-current" />
            </button>
            {/* Город и теги (опционально) */}
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent text-white text-xs">
              <p className="font-medium">{ref.city}</p>
              {ref.tags && ref.tags.length > 0 && (
                <p className="opacity-90">{ref.tags.slice(0, 2).join(", ")}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedRef && (
        <FlipModal
          isOpen={!!selectedRef}
          onClose={handleCloseModal}
          imageUrl={selectedRef.imageUrl}
          title={t('wantTitle')}
          onSubmit={handleSubmit}
          submitLabel={tCommon('submit')}
          submitDisabled={isSubmitting}
        >
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">{t('city')}</label>
              <CitySelect
                value={formData.city}
                onChange={(city) => setFormData({ ...formData, city: city as City })}
                placeholder={tCommon('selectCity')}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">{t('tags')}</label>
              <TagPicker
                selected={formData.tags}
                onToggle={(tag: Tag) => {
                  const set = new Set<Tag>(formData.tags);
                  if (set.has(tag)) {
                    set.delete(tag);
                  } else {
                    set.add(tag);
                  }
                  setFormData({ ...formData, tags: Array.from(set) });
                }}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                {t('description')} <span className="text-muted-foreground font-normal">({tCommon('optional')})</span>
              </label>
              <Textarea
                placeholder={t('example')}
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                rows={3}
              />
            </div>
          </div>
        </FlipModal>
      )}
    </>
  );
}
