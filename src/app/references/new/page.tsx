"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import CitySelect from "@/components/CitySelect";
import TagPicker from "@/components/TagPicker";
import UtDropzone from "@/components/UtDropzone";
import { CITIES, TAGS, type City, type Tag, createReference } from "@/lib/api";
import { toast } from "sonner";
import { posthog } from "@/lib/analytics";

// --- Zod enums из tuple литералов, чтобы получить строгие City/Tag ---
const CityEnum = z.enum(CITIES as unknown as [typeof CITIES[number], ...typeof CITIES[number][]]);
const TagEnum  = z.enum(TAGS as unknown  as [typeof TAGS[number],  ...typeof TAGS[number][]]);

const schema = z.object({
    note: z.string().max(200).optional().or(z.literal("")),
    city: CityEnum, // <- теперь это строго City
    tags: z.array(TagEnum).min(1, "Добавь хотя бы один тег"), // <- строго Tag[]
});
type FormData = z.infer<typeof schema>;

export default function NewReferencePage() {
    const router = useRouter();
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: { note: "", tags: [] }, // city не задаём по умолчанию
    });

    const city = watch("city");   // City | undefined
    const tags = watch("tags");   // Tag[]

    const createRefMutation = useMutation({
        mutationFn: createReference,
        onSuccess: (res) => {
            posthog.capture("create_reference", { city: res.city, tags: res.tags });
            toast.success("Референс создан — скоро подберём мастеров");
            router.push(`/references/${res.id}`);
        },
        onError: () => toast.error("Ошибка при отправке"),
    });

    const onSubmit = async (data: FormData) => {
        if (!imageUrl) {
            toast.error("Добавь фото-референс");
            return;
        }
        await createRefMutation.mutateAsync({
            imageUrl,
            note: data.note || undefined,
            city: data.city,   // уже City
            tags: data.tags,   // уже Tag[]
        });
    };

    return (
        <section className="max-w-2xl mx-auto space-y-6">
            <h1 className="text-2xl font-semibold">Хочу такой маникюр</h1>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                    <label className="text-sm">Фото-референс</label>
                    <UtDropzone onUrl={setImageUrl} />
                    {imageUrl && (
                        <img
                            src={imageUrl}
                            alt=""
                            className="mt-2 h-40 w-auto rounded-lg object-cover border"
                        />
                    )}
                </div>

                <div className="space-y-2">
                    <label className="text-sm">Город</label>
                    <CitySelect
                        value={city as City | undefined}
                        onChange={(c) => setValue("city", c, { shouldValidate: true })}
                        placeholder="Город"
                    />
                    {errors.city && (
                        <p className="text-xs text-red-500">{errors.city.message}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <label className="text-sm">Теги (стиль/цвет)</label>
                    <TagPicker
                        selected={tags as Tag[]}
                        onToggle={(t: Tag) => {
                            const set = new Set<Tag>(tags ?? []);
                            set.has(t) ? set.delete(t) : set.add(t);
                            setValue("tags", Array.from(set), { shouldValidate: true });
                        }}
                    />
                    {errors.tags && (
                        <p className="text-xs text-red-500">{errors.tags.message as string}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <label className="text-sm">Комментарий (необязательно)</label>
                    <Textarea
                        placeholder="Например: хочется более холодный нюд"
                        {...register("note")}
                    />
                </div>

                <Button type="submit" disabled={isSubmitting || createRefMutation.isPending}>
                    {createRefMutation.isPending ? "Отправляем..." : "Отправить"}
                </Button>
            </form>
        </section>
    );
}
