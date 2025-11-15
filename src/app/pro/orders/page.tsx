"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import FlipModal from "@/components/FlipModal";

interface Reference {
  id: string;
  imageUrl: string;
  note?: string;
  city: string;
  tags?: string[];
  status: "open" | "matched" | "closed";
  clientId: string;
}

interface Offer {
  id: string;
  refId: string;
  proId: string;
  message?: string;
  pricePln?: number;
  status: "offer" | "accepted" | "declined";
  createdAt: string;
}

export default function ProOrdersPage() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "matched" | "open">("all");
  const [selectedRef, setSelectedRef] = useState<string | null>(null);

  // Загрузить все офферы мастера
  const { data: allOffers = [], isLoading: offersLoading } = useQuery({
    queryKey: ["my-offers", session?.user?.id],
    queryFn: async () => {
      const res = await fetch("/api/offers/my");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
    enabled: !!session?.user?.id,
  });

  // Загрузить все референсы (для получения инфы по ним)
  const { data: allReferences = [], isLoading: refsLoading } = useQuery({
    queryKey: ["all-references"],
    queryFn: async () => {
      const res = await fetch("/api/references");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
  });

  // Получить уникальные ID референсов, где есть мои офферы
  const myReferenceIds = new Set(allOffers.map((o: Offer) => o.refId));
  
  // Получить полную информацию о этих референсах
  const myReferences = allReferences.filter((ref: Reference) => myReferenceIds.has(ref.id));

  // Фильтровать по статусу
  let filteredReferences = myReferences;
  if (filter === "matched") {
    filteredReferences = myReferences.filter((r: Reference) => r.status === "matched");
  } else if (filter === "open") {
    filteredReferences = myReferences.filter((r: Reference) => r.status === "open");
  }

  const selectedReference = filteredReferences.find((r: Reference) => r.id === selectedRef);
  const selectedOffers = allOffers.filter((o: Offer) => o.refId === selectedRef);

  const handleDeleteOffer = async (offerId: string) => {
    try {
      const res = await fetch(`/api/offers/${offerId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Не удалось удалить");
      toast.success("Оффер удален");
      await qc.invalidateQueries({ queryKey: ["my-offers", session?.user?.id] });
    } catch {
      toast.error("Ошибка при удалении");
    }
  };

  const isLoading = offersLoading || refsLoading;

  if (!session) {
    return <p className="text-center py-12 opacity-70">Необходимо авторизоваться</p>;
  }

  if (session.user?.role !== "pro") {
    return <p className="text-center py-12 opacity-70">Эта страница доступна только для мастеров</p>;
  }

  const handleOpenModal = (refId: string) => {
    setSelectedRef(refId);
  };

  const handleCloseModal = () => {
    setSelectedRef(null);
  };

  return (
    <div className="min-h-screen p-4 pb-8 space-y-6 pt-16 md:pt-4">
      <div>
        <h1 className="text-2xl font-bold mb-2">Мои заказы</h1>
        <p className="text-sm text-muted-foreground">
          Все референсы, где у вас есть офферы
        </p>
      </div>

      {/* Фильтры */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          Все ({myReferences.length})
        </Button>
        <Button
          variant={filter === "open" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("open")}
        >
          Открытые ({myReferences.filter((r: Reference) => r.status === "open").length})
        </Button>
        <Button
          variant={filter === "matched" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("matched")}
        >
          Согласованные ({myReferences.filter((r: Reference) => r.status === "matched").length})
        </Button>
      </div>

      {/* Галерея референсов */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : filteredReferences.length === 0 ? (
        <p className="text-center py-12 text-sm text-muted-foreground">
          {filter === "all" && "У вас пока нет офферов"}
          {filter === "open" && "Нет открытых референсов с вашими офферами"}
          {filter === "matched" && "Нет согласованных референсов"}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {filteredReferences.map((ref: Reference) => (
            <div
              key={ref.id}
              className="relative aspect-[3/4] rounded-lg overflow-hidden group cursor-pointer"
              onClick={() => handleOpenModal(ref.id)}
            >
              <Image
                src={ref.imageUrl}
                alt={ref.note || "Референс"}
                fill
                sizes="50vw"
                className="object-cover"
              />
              {/* Статус бейдж */}
              <div className="absolute top-2 left-2 z-10 px-2 py-1 rounded bg-black/50 text-white text-xs font-medium">
                {ref.status === "open" ? "🟢 Open" : "✅ Matched"}
              </div>
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

      {/* Модальное окно с эффектом переворота */}
      {selectedReference && (
        <FlipModal
          isOpen={!!selectedReference}
          onClose={handleCloseModal}
          imageUrl={selectedReference.imageUrl}
          title={`Референс #${selectedReference.id.slice(0, 6)}`}
        >
          <div className="space-y-4">
            {/* Статус */}
            <div>
              <p className="text-xs font-medium opacity-70 mb-1">Статус</p>
              <p className={`text-sm font-semibold ${
                selectedReference.status === "open" ? "text-green-600" : "text-blue-600"
              }`}>
                {selectedReference.status === "open" ? "🟢 Open" : "✅ Matched"}
              </p>
            </div>

            {/* Локация */}
            <div>
              <p className="text-xs font-medium opacity-70 mb-1">Локация</p>
              <p className="text-sm font-medium">{selectedReference.city}</p>
            </div>

            {/* Теги */}
            {selectedReference.tags && selectedReference.tags.length > 0 && (
              <div>
                <p className="text-xs font-medium opacity-70 mb-1">Теги</p>
                <div className="flex flex-wrap gap-1">
                  {selectedReference.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="inline-block px-2 py-1 bg-muted rounded text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Заметка клиента */}
            {selectedReference.note && (
              <div>
                <p className="text-xs font-medium opacity-70 mb-1">Заметка клиента</p>
                <p className="text-sm p-3 bg-muted rounded-lg">{selectedReference.note}</p>
              </div>
            )}

            {/* Ваш оффер */}
            <div className="pt-4 border-t space-y-3">
              <h3 className="text-sm font-semibold">Ваш оффер</h3>

              {selectedOffers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Оффер не найден</p>
              ) : (
                <div className="space-y-2">
                  {selectedOffers.map((offer: Offer) => (
                    <div
                      key={offer.id}
                      className="p-3 rounded-lg border space-y-2 bg-primary/5"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-medium opacity-70">Статус</p>
                          <p className="text-sm font-semibold capitalize">{offer.status}</p>
                        </div>
                        {offer.status === "offer" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteOffer(offer.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            Удалить
                          </Button>
                        )}
                      </div>

                      <div>
                        <p className="text-xs font-medium opacity-70">Создан</p>
                        <p className="text-sm">
                          {new Date(offer.createdAt).toLocaleDateString("ru-RU")}
                        </p>
                      </div>

                      {offer.message && (
                        <div>
                          <p className="text-xs font-medium opacity-70 mb-1">Сообщение</p>
                          <p className="text-sm">{offer.message}</p>
                        </div>
                      )}

                      {typeof offer.pricePln === "number" && (
                        <div>
                          <p className="text-xs font-medium opacity-70 mb-1">Цена</p>
                          <p className="text-sm font-semibold text-green-600">
                            💰 {offer.pricePln} PLN
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </FlipModal>
      )}
    </div>
  );
}
