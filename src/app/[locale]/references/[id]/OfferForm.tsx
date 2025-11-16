"use client";

import * as React from "react";
import { useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createOffer } from "@/lib/api";
import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "@/i18n/routing";

export default function OfferForm({ refId }: { refId: string }) {
    const t = useTranslations('offers.pro');
    const tCommon = useTranslations('common');
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
            toast.success(t('sent'));
            await qc.invalidateQueries({ queryKey: ["offers", "by-ref", refId] });
            router.push("/pros");
        },
        onError: (e: unknown) => {
            const error = e instanceof Error ? e.message : String(e);
            const msg =
                error?.includes("409") || error?.toLowerCase?.().includes("unique")
                    ? t('alreadySent')
                    : error ?? t('error');
            toast.error(msg);
        },
    });

    return (
        <div className="grid gap-2 max-w-md">
            <input
                type="number"
                placeholder={t('pricePln')}
                inputMode="numeric"
                min={0}
                step={1}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="border rounded px-3 py-2"
            />
            <textarea
                placeholder={`${tCommon('message')} (${tCommon('optional')})`}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="border rounded px-3 py-2 min-h-20"
            />
            <button
                onClick={() => m.mutate()}
                disabled={m.isPending}
                className="border rounded px-3 py-2 hover:bg-muted disabled:opacity-60"
            >
                {m.isPending ? tCommon('sending') : t('sendOffer')}
            </button>
        </div>
    );
}
