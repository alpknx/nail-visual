"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyProProfile, upsertProProfile } from "@/lib/api";
import { type City, CITIES } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CitySelect from "@/components/CitySelect";
import { toast } from "sonner";

// ✅ Простая схема: число опционально, без coerce/invalid_type_error
const schema = z.object({
    minPricePln: z.number().min(0).optional(),
    instagram: z.string().url().optional().or(z.literal("")),
    city: z.string().optional(),
    bio: z.string().max(200).optional().or(z.literal("")),
});
type FormData = z.infer<typeof schema>;

// helper: безопасно привести произвольную строку к City | undefined
function toCity(v?: string): City | undefined {
    if (!v) return undefined;
    // CITIES должен быть as const в lib/api (если ещё нет — можно там поправить)
    return (CITIES as readonly string[]).includes(v) ? (v as City) : undefined;
}

export default function ProMePage() {
    const { userId } = useAuth();
    const qc = useQueryClient();

    // грузим профиль мастера
    const { data, isLoading } = useQuery({
        queryKey: ["pro", userId],
        queryFn: () => getMyProProfile(),
    });

    // форма
    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { isSubmitting },
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: { minPricePln: undefined, instagram: "", city: "", bio: "" },
    });

    useEffect(() => {
        if (data) {
            reset({
                minPricePln: data.minPricePln ?? undefined,
                instagram: data.instagram ?? "",
                city: data.city ?? "",
                bio: data.bio ?? "",
            });
        }
    }, [data, reset]);

    const mutation = useMutation({
        mutationFn: (v: FormData) =>
            upsertProProfile({
                minPricePln: v.minPricePln,
                instagram: v.instagram || undefined,
                city: toCity(v.city),            // ✅ приводим к City | undefined
                bio: v.bio || undefined,
            }),
        onSuccess: () => {
            toast.success("Профиль сохранён");
            qc.invalidateQueries({ queryKey: ["pro", userId] });
        },
        onError: () => {
            toast.error("Не удалось сохранить профиль");
        },
    });

    if (isLoading) return <div className="h-32 rounded-2xl border animate-pulse" />;

    return (
        <form className="max-w-md space-y-4" onSubmit={handleSubmit((v) => mutation.mutate(v))}>
            <div>
                <label className="text-sm">Город</label>
                <CitySelect value={watch("city")} onChange={(c) => setValue("city", c)} />
            </div>

            <div>
                <label className="text-sm">Цена “от” (zł)</label>
                <Input
                    type="number"
                    step="1"
                    // ✅ превращаем "" → undefined и NaN → undefined до валидатора
                    {...register("minPricePln", {
                        valueAsNumber: true,
                        setValueAs: (v) => (v === "" || Number.isNaN(v) ? undefined : v),
                    })}
                />
            </div>

            <div>
                <label className="text-sm">Instagram (https://…)</label>
                <Input placeholder="https://instagram.com/..." {...register("instagram")} />
            </div>

            <div>
                <label className="text-sm">О себе</label>
                <Input {...register("bio")} />
            </div>

            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
                {mutation.isPending ? "Сохраняем..." : "Сохранить"}
            </Button>
        </form>
    );
}
