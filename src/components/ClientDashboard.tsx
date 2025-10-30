"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";

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
  pro?: {
    id: string;
    name: string;
    image?: string;
    phone?: string;
  };
}

export default function ClientDashboard() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const [selectedRef, setSelectedRef] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // Загрузить свои референсы
  const { data: myReferences, isLoading: refLoading } = useQuery({
    queryKey: ["my-references", session?.user?.id],
    queryFn: async () => {
      const res = await fetch("/api/references");
      if (!res.ok) throw new Error("Не удалось загрузить референсы");
      const json = await res.json() as { data: Reference[] };
      // Фильтруем только свои (которые создал текущий пользователь)
      return (json.data || []).filter((ref: Reference) => ref.clientId === session?.user?.id);
    },
    enabled: !!session?.user?.id,
  });

  // Загрузить офферы к выбранному референсу
  const { data: offers, isLoading: offersLoading } = useQuery({
    queryKey: ["offers", selectedRef],
    queryFn: async () => {
      if (!selectedRef) return [];
      
      const res = await fetch(`/api/offers?referenceId=${selectedRef}`);
      if (!res.ok) return [];
      
      const json = await res.json() as { data: Offer[] };
      return json.data || [];
    },
    enabled: !!selectedRef,
  });

  const references = myReferences || [];
  const selectedReference = references.find((r: Reference) => r.id === selectedRef);

  const handleDeleteReference = async () => {
    if (!selectedRef) return;
    
    const ref = selectedReference;
    if (!ref) return;

    // Проверка перед удалением matched референса
    if (ref.status === "matched") {
      const confirmed = window.confirm(
        "⚠️ Внимание! Этот референс matched (согласован с мастером).\n\n" +
        "Если вы удалите его, удалятся и все офферы мастера!\n\n" +
        "Вы уверены?"
      );
      if (!confirmed) return;
    }

    setIsDeleting(selectedRef);
    try {
      const res = await fetch(`/api/references/${selectedRef}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Не удалось удалить");
      toast.success(ref.status === "matched" 
        ? "Референс и все офферы удалены" 
        : "Референс удален");
      setSelectedRef(null);
      await qc.invalidateQueries({ queryKey: ["my-references", session?.user?.id] });
    } catch {
      toast.error("Ошибка при удалении");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleOfferAction = async (offerId: string, action: "accepted" | "declined") => {
    setIsProcessing(offerId);
    try {
      const res = await fetch(`/api/offers/${offerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action }),
      });
      if (!res.ok) throw new Error("Не удалось обновить статус");
      
      toast.success(action === "accepted" ? "Оффер принят" : "Оффер отклонён");
      await qc.invalidateQueries({ queryKey: ["offers", selectedRef] });
      await qc.invalidateQueries({ queryKey: ["my-references", session?.user?.id] });
    } catch (e) {
      toast.error((e as Error).message || "Ошибка при обновлении");
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Левая колонка: Мои референсы */}
      <div className="col-span-1 space-y-2">
        <h2 className="text-lg font-semibold">Мои референсы</h2>
        
        {refLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 rounded border animate-pulse bg-muted" />
            ))}
          </div>
        ) : references.length === 0 ? (
          <p className="text-sm opacity-70">Еще нет референсов</p>
        ) : (
          <div className="space-y-2">
            {references.map((ref: Reference) => (
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

      {/* Правая колонка: Информация выбранного референса и его офферы */}
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
                      {selectedReference.tags?.map((tag) => (
                        <span key={tag} className="inline-block px-2 py-1 bg-gray-100 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {selectedReference.note && (
                    <div>
                      <p className="text-xs opacity-70 mb-1">Заметка</p>
                      <p className="text-sm">{selectedReference.note}</p>
                    </div>
                  )}

                  <button
                    onClick={handleDeleteReference}
                    disabled={isDeleting === selectedRef}
                    className={`mt-2 px-3 py-1 rounded text-sm font-medium transition disabled:opacity-50 ${
                      selectedReference.status === "matched"
                        ? "bg-orange-100 text-orange-700 hover:bg-orange-200"
                        : "bg-red-100 text-red-700 hover:bg-red-200"
                    }`}
                  >
                    {isDeleting === selectedRef 
                      ? "Удаляю..." 
                      : selectedReference.status === "matched"
                      ? "⚠️ Удалить (удалит офферы)"
                      : "🗑️ Удалить"}
                  </button>
                </div>
              </div>
            </div>

            {/* Офферы мастеров */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Офферы мастеров</h3>
              
              {offersLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="h-20 rounded border animate-pulse bg-muted" />
                  ))}
                </div>
              ) : !offers?.length ? (
                <p className="text-sm opacity-70">Пока нет откликов</p>
              ) : (
                <div className="space-y-2">
                  {offers.map((offer: Offer) => (
                    <div
                      key={offer.id}
                      className="p-4 rounded-lg border space-y-2 hover:bg-gray-50 transition"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          {offer.pro?.image && (
                            <Image
                              src={offer.pro.image}
                              alt={offer.pro.name || "Pro"}
                              width={48}
                              height={48}
                              className="rounded-full w-12 h-12 object-cover flex-shrink-0"
                            />
                          )}
                          <div className="flex-1">
                            <p className="text-sm font-semibold">
                              {offer.pro?.name || `Мастер ${offer.proId.slice(0, 6)}`}
                            </p>
                            {offer.status === "accepted" && offer.pro?.phone && (
                              <a 
                                href={`tel:${offer.pro.phone}`}
                                className="text-xs text-blue-600 hover:underline"
                              >
                                {offer.pro.phone}
                              </a>
                            )}
                            <p className="text-xs opacity-70 mt-1">
                              {new Date(offer.createdAt).toLocaleDateString("ru-RU")}
                            </p>
                          </div>
                        </div>
                        <span className={`text-xs font-medium px-2 py-1 rounded flex-shrink-0 ${
                          offer.status === "accepted" 
                            ? "bg-green-100 text-green-700"
                            : offer.status === "declined"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-700"
                        }`}>
                          {offer.status === "accepted" ? "✅ Принят" : 
                           offer.status === "declined" ? "❌ Отклонён" : 
                           "Новый"}
                        </span>
                      </div>

                      {offer.message && (
                        <p className="text-sm">{offer.message}</p>
                      )}
                      
                      {typeof offer.pricePln === "number" && (
                        <p className="text-sm font-semibold text-green-600">
                          Цена: {offer.pricePln} PLN
                        </p>
                      )}

                      {offer.status === "offer" && (
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => handleOfferAction(offer.id, "accepted")}
                            disabled={isProcessing === offer.id}
                            className="flex-1 px-3 py-2 rounded bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition"
                          >
                            {isProcessing === offer.id ? "Принимаю..." : "Принять"}
                          </button>
                          <button
                            onClick={() => handleOfferAction(offer.id, "declined")}
                            disabled={isProcessing === offer.id}
                            className="flex-1 px-3 py-2 rounded border text-sm font-medium hover:bg-gray-100 disabled:opacity-50 transition"
                          >
                            {isProcessing === offer.id ? "Отклоняю..." : "Отклонить"}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <p className="text-center opacity-70 py-12">
            Выбери референс слева, чтобы увидеть все офферы
          </p>
        )}
      </div>
    </div>
  );
}
