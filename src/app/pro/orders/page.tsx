"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";

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

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-2">Мои заказы</h1>
        <p className="text-sm opacity-70">Все референсы, где у вас есть офферы</p>
      </div>

      {/* Фильтры */}
      <div className="flex gap-2">
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

      <div className="grid grid-cols-3 gap-6">
        {/* Левая колонка: Список референсов */}
        <div className="col-span-1 space-y-2">
          <h2 className="text-lg font-semibold">Референсы ({filteredReferences.length})</h2>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 rounded border animate-pulse bg-muted" />
              ))}
            </div>
          ) : filteredReferences.length === 0 ? (
            <p className="text-sm opacity-70">
              {filter === "all" && "У вас пока нет офферов"}
              {filter === "open" && "Нет открытых референсов с вашими офферами"}
              {filter === "matched" && "Нет согласованных референсов"}
            </p>
          ) : (
            <div className="space-y-2">
              {filteredReferences.map((ref: Reference) => (
                <button
                  key={ref.id}
                  onClick={() => setSelectedRef(ref.id)}
                  className={`w-full text-left p-3 rounded border transition ${
                    selectedRef === ref.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-muted hover:border-gray-300"
                  }`}
                >
                  <div className="flex gap-2 items-start">
                    <div className="relative w-12 h-16 rounded overflow-hidden flex-shrink-0">
                      <Image
                        src={ref.imageUrl}
                        alt="Reference image"
                        width={48}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{ref.city}</p>
                      <p className="text-xs opacity-70">
                        {ref.tags?.slice(0, 2).join(" • ")}
                      </p>
                      <p className={`text-xs font-medium ${
                        ref.status === "open" ? "text-green-600" : "text-blue-600"
                      }`}>
                        {ref.status === "open" ? "🟢 Open" : "✅ Matched"}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Правая колонка: Информация о выбранном референсе и ваш оффер */}
        <div className="col-span-2 space-y-4">
          {selectedReference ? (
            <>
              {/* Информация о референсе */}
              <div className="border rounded-xl p-4 space-y-3">
                <div className="flex gap-4">
                  <div className="relative w-48 h-60 rounded-lg overflow-hidden flex-shrink-0">
                    <Image
                      src={selectedReference.imageUrl}
                      alt="Reference image"
                      width={192}
                      height={240}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 space-y-3">
                    <div>
                      <h3 className="font-semibold text-lg">
                        Референс #{selectedReference.id.slice(0, 6)}
                      </h3>
                      <p className={`text-sm font-medium mt-1 ${
                        selectedReference.status === "open" ? "text-green-600" : "text-blue-600"
                      }`}>
                        {selectedReference.status === "open" ? "🟢 Open" : "✅ Matched"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs opacity-70 mb-1">Локация</p>
                      <p className="text-sm font-medium">{selectedReference.city}</p>
                    </div>

                    <div>
                      <p className="text-xs opacity-70 mb-1">Теги</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedReference.tags?.map((tag: string) => (
                          <span key={tag} className="inline-block px-2 py-1 bg-gray-100 rounded text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {selectedReference.note && (
                      <div>
                        <p className="text-xs opacity-70 mb-1">Заметка клиента</p>
                        <p className="text-sm">{selectedReference.note}</p>
                      </div>
                    )}

                    <Link href={`/references/${selectedReference.id}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        Открыть полностью →
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Ваш оффер */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Ваш оффер</h3>

                {selectedOffers.length === 0 ? (
                  <p className="text-sm opacity-70">Оффер не найден</p>
                ) : (
                  <div className="space-y-2">
                    {selectedOffers.map((offer: Offer) => (
                      <div
                        key={offer.id}
                        className="p-4 rounded-lg border space-y-2 bg-blue-50"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium">Статус: {offer.status}</p>
                            <p className="text-xs opacity-70 mt-1">
                              Создан: {new Date(offer.createdAt).toLocaleDateString("ru-RU")}
                            </p>
                          </div>
                          {offer.status === "offer" && (
                            <button
                              onClick={() => handleDeleteOffer(offer.id)}
                              className="text-xs text-red-600 hover:text-red-700 underline"
                            >
                              Удалить
                            </button>
                          )}
                        </div>

                        {offer.message && (
                          <p className="text-sm">{offer.message}</p>
                        )}

                        {typeof offer.pricePln === "number" && (
                          <p className="text-sm font-semibold text-green-600">
                            💰 {offer.pricePln} PLN
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-center opacity-70 py-12">
              Выбери референс слева, чтобы увидеть свой оффер
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
