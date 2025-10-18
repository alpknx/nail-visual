"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { upsertProProfile } from "@/lib/api";
import { Button } from "@/components/ui/button";

// 1) Схема: принимаем строки из инпутов и превращаем их в нужные типы
const schema = z.object({
    bio: z
        .string()
        .max(500)
        .optional()
        .nullable()
        .transform((v) => (v === "" ? null : v ?? null)),
    instagram: z
        .string()
        .optional()
        .nullable()
        .transform((v) => (v === "" ? null : v ?? null)),
    // из инпута всегда приходит строка — приводим к number | null
    minPricePln: z
        .preprocess(
            (v) => (v === "" || v == null ? null : typeof v === "string" ? Number(v) : v),
            z.number().int().min(0).max(100000).nullable()
        )
        .optional(),
    city: z
        .string()
        .optional()
        .nullable()
        .transform((v) => (v === "" ? null : v ?? null)),
});

// 2) ВАЖНО: форма работает с ВХОДОМ схемы (до transform), т.е. со строками
type FormData = z.input<typeof schema>;

export default function ProProfileForm({
                                           initialData,
                                       }: {
    // initialData уже «нормализовано» как выход схемы: null/number и т.п.
    initialData: {
        bio: string | null;
        instagram: string | null;
        minPricePln: number | null;
        city: string | null;
    } | null;
}) {
    const qc = useQueryClient();

    const {
        register,
        handleSubmit,
        formState: { isSubmitting },
        reset,
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        // defaultValues должны соответствовать ВХОДУ (строки), не выходу.
        defaultValues: {
            bio: initialData?.bio ?? "",
            instagram: initialData?.instagram ?? "",
            // число превращаем в строку для инпута; пусто = ""
            minPricePln:
                typeof initialData?.minPricePln === "number"
                    ? String(initialData.minPricePln)
                    : "",
            city: initialData?.city ?? "",
        },
    });

    const mutation = useMutation({
        // сюда прилетит уже ПРОГНАННОЕ через schema значение (number|null и т.д.)
        mutationFn: async (values: FormData) => {
            // пропускаем values через schema вручную, чтобы получить выход (parsed)
            const parsed = schema.parse(values);
            return upsertProProfile(parsed);
        },
        onSuccess: async (saved) => {
            await qc.invalidateQueries({ queryKey: ["pro", "me"] });
            // reset должен снова получить «входные» значения (строки)
            reset({
                bio: saved?.bio ?? "",
                instagram: saved?.instagram ?? "",
                minPricePln:
                    typeof saved?.minPricePln === "number" ? String(saved.minPricePln) : "",
                city: saved?.city ?? "",
            });
        },
    });

    const onSubmit = (values: FormData) => mutation.mutate(values);

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
                <label className="text-sm">Город</label>
                <input
                    className="border rounded-md h-9 px-2 w-full"
                    placeholder="Например, Kraków"
                    {...register("city")}
                />
            </div>

            <div className="space-y-1">
                <label className="text-sm">Минимальная цена (PLN)</label>
                <input
                    type="number"
                    inputMode="numeric"
                    className="border rounded-md h-9 px-2 w-full"
                    placeholder="например, 120"
                    {...register("minPricePln")}
                />
            </div>

            <div className="space-y-1">
                <label className="text-sm">Instagram (ссылка)</label>
                <input
                    className="border rounded-md h-9 px-2 w-full"
                    placeholder="https://instagram.com/..."
                    {...register("instagram")}
                />
            </div>

            <div className="space-y-1">
                <label className="text-sm">О себе</label>
                <textarea
                    rows={4}
                    className="border rounded-md px-2 py-2 w-full"
                    placeholder="Короткое описание"
                    {...register("bio")}
                />
            </div>

            <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting || mutation.isPending}>
                    {mutation.isPending ? "Сохраняем..." : "Сохранить"}
                </Button>
            </div>
        </form>
    );
}
