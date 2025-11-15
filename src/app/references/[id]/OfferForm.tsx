"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createOffer } from "@/lib/api";
import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OfferForm({ refId }: { refId: string }) {
    const qc = useQueryClient();
    const router = useRouter();
    const [price, setPrice] = useState<string>("");
    const [message, setMessage] = useState("");

    const m = useMutation({
        mutationFn: async () =>
            createOffer({
                refId,
                pricePln: price === "" ? null : Number(price),
                message: message.trim() || null,
            }),
        onSuccess: async () => {
            setPrice("");
            setMessage("");
            toast.success("Оффер отправлен");
            await qc.invalidateQueries({ queryKey: ["offers", "by-ref", refId] });
            // Перенаправляем в каталог мастеров
            router.push("/pros");
        },
        onError: (e: unknown) => {
            // сервер может вернуть 409 при уникальном ограничении (pro уже откликался)
            const error = e instanceof Error ? e.message : String(e);
            const msg =
                error?.includes("409") || error?.toLowerCase?.().includes("unique")
                    ? "Вы уже отправили оффер на этот референс"
                    : error ?? "Не удалось отправить оффер";
            toast.error(msg);
        },
    });

    return (
        <div className="grid gap-2 max-w-md">
            <input
                type="number"
                placeholder="Цена (PLN)"
                inputMode="numeric"
                min={0}
                step={1}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="border rounded px-3 py-2"
            />
            <textarea
                placeholder="Сообщение для клиента (необязательно)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="border rounded px-3 py-2 min-h-20"
            />
            <button
                onClick={() => m.mutate()}
                disabled={m.isPending}
                className="border rounded px-3 py-2 hover:bg-muted disabled:opacity-60"
            >
                {m.isPending ? "Отправляем…" : "Отправить оффер"}
            </button>
        </div>
    );
}
