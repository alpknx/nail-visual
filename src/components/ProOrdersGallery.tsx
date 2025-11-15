"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import FlipModal from "@/components/FlipModal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import CitySelect from "@/components/CitySelect";
import { listReferences, createOffer, type City, type ClientReference } from "@/lib/api";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { CheckCircle } from "lucide-react";

export default function ProOrdersGallery() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const initialCity = (searchParams.get("city") as City | null) || undefined;
  const [selectedCity, setSelectedCity] = useState<City | undefined>(initialCity);
  const [selectedRef, setSelectedRef] = useState<ClientReference | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    message: "",
    pricePln: "",
  });

  // Загрузить все референсы (отфильтрованные по городу)
  const { data: references = [], isLoading } = useQuery({
    queryKey: ["references", selectedCity],
    queryFn: () => listReferences({ city: selectedCity, limit: 100 }),
  });

  // Фильтруем только открытые референсы
  const openReferences = references.filter(
    (ref: ClientReference) => ref.status === "open"
  );

  const handleOpenModal = (ref: ClientReference) => {
    setSelectedRef(ref);
    setFormData({
      message: "",
      pricePln: "",
    });
  };

  const handleCloseModal = () => {
    setSelectedRef(null);
  };

  const handleSubmit = async () => {
    if (!selectedRef) return;

    if (!session) {
      toast.error("Необходимо войти");
      return;
    }

    setIsSubmitting(true);
    try {
      await createOffer({
        refId: selectedRef.id,
        message: formData.message || undefined,
        pricePln: formData.pricePln ? parseInt(formData.pricePln, 10) : undefined,
      });
      toast.success("Оффер отправлен!");
      setSelectedRef(null);
      // Обновить список
      window.location.reload();
    } catch (error) {
      toast.error("Ошибка при отправке оффера");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="sticky top-0 bg-background z-10 pb-4">
          <CitySelect
            value={selectedCity}
            onChange={(city) => setSelectedCity(city as City)}
            placeholder="Все города"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Фильтр по городу */}
        <div className="sticky top-0 bg-background z-10 pb-4">
          <CitySelect
            value={selectedCity}
            onChange={(city) => setSelectedCity(city as City)}
            placeholder="Все города"
          />
        </div>

        {/* Галерея заказов */}
        {openReferences.length === 0 ? (
          <p className="text-center py-12 opacity-70">
            Нет открытых заказов в этом городе
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 pb-4">
            {openReferences.map((ref: ClientReference, index: number) => (
              <div
                key={ref.id}
                className="relative aspect-[3/4] rounded-lg overflow-hidden group cursor-pointer"
                onClick={() => handleOpenModal(ref)}
              >
                <Image
                  src={ref.imageUrl}
                  alt={ref.note || "Заказ"}
                  fill
                  sizes="50vw"
                  className="object-cover"
                  priority={index === 0}
                />
                {/* Кнопка МОГУ */}
                <button
                  className="absolute top-2 right-2 z-10 p-2 rounded-full bg-primary/90 text-primary-foreground hover:bg-primary transition-colors shadow-lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenModal(ref);
                  }}
                  aria-label="Могу"
                >
                  <CheckCircle className="w-5 h-5 fill-current" />
                </button>
                {/* Город и теги */}
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent text-white text-xs">
                  <p className="font-medium">{ref.city}</p>
                  {ref.tags && ref.tags.length > 0 && (
                    <p className="opacity-90">{ref.tags.slice(0, 2).join(", ")}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedRef && (
        <FlipModal
          isOpen={!!selectedRef}
          onClose={handleCloseModal}
          imageUrl={selectedRef.imageUrl}
          title="Могу сделать"
          onSubmit={handleSubmit}
          submitLabel="Отправить"
          submitDisabled={isSubmitting}
        >
          <div className="space-y-4">
            {selectedRef.note && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Описание заказа
                </label>
                <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                  {selectedRef.note}
                </p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">
                Цена (PLN)
              </label>
              <Input
                type="number"
                placeholder="Например: 150"
                value={formData.pricePln}
                onChange={(e) =>
                  setFormData({ ...formData, pricePln: e.target.value })
                }
                min="0"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Описание (могу)
              </label>
              <Textarea
                placeholder="Например: могу сделать такой маникюр, есть опыт работы с этим стилем..."
                value={formData.message}
                onChange={(e) =>
                  setFormData({ ...formData, message: e.target.value })
                }
                rows={4}
              />
            </div>
          </div>
        </FlipModal>
      )}
    </>
  );
}
