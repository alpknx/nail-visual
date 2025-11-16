"use client";

import * as React from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    getReference,
    listOffersByReference,
    patchOfferStatus,
    type Offer,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import OfferForm from "./OfferForm";

export default function ReferenceDetailPage() {
    // безопасно вытаскиваем id из маршрута
    const params = useParams<{ id?: string | string[] }>();
    const id = React.useMemo(() => {
        const raw = params?.id;
        return Array.isArray(raw) ? raw[0] : raw;
    }, [params]);

    const qc = useQueryClient();
    const { data: session } = useSession();
    const role = session?.user?.role as "client" | "pro" | "admin" | undefined;

    // сам референс
    const {
        data: ref,
        isLoading: refLoading,
        isFetching: refFetching,
        error: refError,
    } = useQuery({
        queryKey: ["reference", id],
        queryFn: () => getReference(id as string),
        enabled: !!id,
    });

    // офферы по референсу
    const {
        data: offers,
        isLoading: offLoading,
        isFetching: offFetching,
        error: offError,
    } = useQuery({
        queryKey: ["offers", "by-ref", id],
        queryFn: () => listOffersByReference(id as string),
        enabled: !!id,
    });

    // принять оффер (обновление статуса референса делает серверная транзакция)
    const acceptMutation = useMutation({
        mutationFn: async (offer: Offer) => patchOfferStatus(offer.id, "accepted"),
        onSuccess: async () => {
            toast.success("Отклик принят");
            await Promise.all([
                qc.invalidateQueries({ queryKey: ["offers", "by-ref", id] }),
                qc.invalidateQueries({ queryKey: ["reference", id] }),
            ]);
        },
        onError: (e: Error | null) => toast.error(e?.message ?? "Не удалось принять"),
    });

    // отклонить оффер
    const declineMutation = useMutation({
        mutationFn: (offer: Offer) => patchOfferStatus(offer.id, "declined"),
        onSuccess: async () => {
            toast.success("Отклик отклонён");
            await qc.invalidateQueries({ queryKey: ["offers", "by-ref", id] });
        },
        onError: (e: Error | null) => toast.error(e?.message ?? "Не удалось отклонить"),
    });

    // удалить оффер (только для мастера)
    const deleteOfferMutation = useMutation({
        mutationFn: async (offerId: string) => {
            const res = await fetch(`/api/offers/${offerId}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Не удалось удалить оффер");
            return res.json();
        },
        onSuccess: async () => {
            toast.success("Оффер удален");
            await qc.invalidateQueries({ queryKey: ["offers", "by-ref", id] });
        },
        onError: (e: Error) => toast.error(e.message),
    });

    if (!id) return <p className="opacity-70">Загружаем…</p>;
    if (refLoading) return <div className="h-64 rounded-2xl border animate-pulse" />;
    if (refError) return <p className="text-red-600">Ошибка загрузки референса</p>;
    if (!ref) return <p className="opacity-70">Референс не найден</p>;

    const isClient = role === "client";
    const isPro = role === "pro";
    const actionsDisabled =
        !isClient || // кнопки только для клиента
        acceptMutation.isPending ||
        declineMutation.isPending ||
        ref.status !== "open";

    return (
        <section className="space-y-6">
            <header className="flex gap-4 items-start justify-between">
                <div className="flex gap-4 items-start flex-1">
                    <div className="relative w-48 h-60 rounded-xl overflow-hidden border bg-muted">
                        {/* убедись, что домен картинки добавлен в next.config.js -> images.domains */}
                        <Image 
                            src={ref.imageUrl} 
                            alt="Изображение референса" 
                            fill
                            sizes="192px"
                            className="object-cover"
                            priority
                        />
                    </div>

                    <div className="space-y-1 flex-1">
                        <h1 className="text-xl font-semibold">Референс #{ref.id.slice(0, 6)}</h1>
                        <p className="text-sm opacity-70">
                            {ref.city} • {(ref.tags?.length ? ref.tags.join(" • ") : "без тегов")} • статус: {ref.status}
                            {(refFetching || offFetching) && " • обновляем…"}
                        </p>
                        {ref.note && <p className="text-sm">{ref.note}</p>}
                    </div>
                </div>
            </header>

            {/* Форма оффера — только для мастера и только пока референс открыт */}
            {isPro && ref.status === "open" && (
                <section className="space-y-2">
                    <h2 className="text-lg font-semibold">Сделать оффер</h2>
                    <OfferForm refId={id} />
                </section>
            )}

            <section className="space-y-3">
                <h2 className="text-lg font-semibold">Отклики мастеров</h2>

                {offLoading ? (
                    <div className="grid gap-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="h-16 rounded-xl border animate-pulse" />
                        ))}
                    </div>
                ) : offError ? (
                    <p className="text-red-600">Ошибка загрузки откликов</p>
                ) : !offers?.length ? (
                    <p className="opacity-70">Пока нет откликов</p>
                ) : (
                    <ul className="space-y-2">
                        {offers.map((offer) => {
                            const disabled = actionsDisabled || offer.status !== "offer";
                            const isAccepted = offer.status === "accepted";
                            return (
                                <li
                                    key={offer.id}
                                    className="p-3 rounded-xl border flex items-center justify-between"
                                >
                                    <div className="flex-1">
                                        <div className="text-sm font-medium">
                                            {isAccepted && offer.pro?.name
                                                ? `${offer.pro.name}`
                                                : `Мастер ${offer.proId.slice(0, 6)}`}
                                        </div>
                                        <div className="text-xs opacity-70">
                                            {formatDateTime(offer.createdAt)} • статус: {offer.status}
                                        </div>
                                        {offer.message && <div className="text-sm mt-1">{offer.message}</div>}
                                        {typeof offer.pricePln === "number" && (
                                            <div className="text-sm mt-1 opacity-80">Цена: {offer.pricePln} PLN</div>
                                        )}
                                        
                                        {/* Показываем контакты при matched статусе ТОЛЬКО ДЛЯ СОБСТВЕННИКА РЕФЕРЕНСА */}
                                        {isAccepted && offer.pro && session?.user?.id === ref.clientId && (
                                            <div className="mt-2 pt-2 border-t space-y-1">
                                                {offer.pro.phone && (
                                                    <div className="text-sm">
                                                        <span className="opacity-70">Телефон: </span>
                                                        <a href={`tel:${offer.pro.phone}`} className="font-medium hover:underline">
                                                            {offer.pro.phone}
                                                        </a>
                                                    </div>
                                                )}
                                                {offer.pro.image && (
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Image
                                                            src={offer.pro.image}
                                                            alt={offer.pro.name || "Мастер"}
                                                            width={24}
                                                            height={24}
                                                            className="rounded-full"
                                                        />
                                                        <span className="text-sm">{offer.pro.name}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-2 flex-col sm:flex-row">
                                        {isClient && (
                                            <>
                                                <Button
                                                    variant="outline"
                                                    disabled={disabled}
                                                    onClick={() => acceptMutation.mutate(offer)}
                                                    aria-disabled={disabled}
                                                    className="whitespace-nowrap"
                                                >
                                                    Принять
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    disabled={disabled}
                                                    onClick={() => declineMutation.mutate(offer)}
                                                    aria-disabled={disabled}
                                                    className="whitespace-nowrap"
                                                >
                                                    Отклонить
                                                </Button>
                                            </>
                                        )}
                                        {isPro && offer.proId === session?.user?.id && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                disabled={deleteOfferMutation.isPending}
                                                onClick={() => deleteOfferMutation.mutate(offer.id)}
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            >
                                                {deleteOfferMutation.isPending ? "Удаляю..." : "🗑️ Удалить оффер"}
                                            </Button>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>
        </section>
    );
}

/** компактное форматирование даты/времени */
function formatDateTime(iso: string) {
    try {
        return new Date(iso).toLocaleString();
    } catch {
        return iso;
    }
}
