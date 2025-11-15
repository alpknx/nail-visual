"use client";

import Image from "next/image";
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
            toast.success("Референс создан — ждём офферы от мастеров");
            router.push("/");
        },
        onError: () => {
            toast.error("Ошибка при отправке");
        },
    });

    const onSubmit = async (data: FormData) => {
        if (!imageUrl) {
            toast.error("Добавь фото-референс");
            return;
        }
        try {
            await createRefMutation.mutateAsync({
                imageUrl,
                note: data.note || undefined,
                city: data.city,
                tags: data.tags,
            });
        } catch {
            // ошибка обработана в onError
        }
    };

    return (
        <div className="min-h-screen p-4 pb-8 pt-16 md:pt-4">
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold">Хочу такой маникюр</h1>
                    <p className="text-sm text-muted-foreground">
                        Загрузи фото желаемого маникюра
                    </p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Фото-референс */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium block">
                            Фото-референс
                        </label>
                        <UtDropzone onUrl={setImageUrl} />
                        {imageUrl && (
                            <div className="relative w-full aspect-square max-w-md mx-auto rounded-lg border-2 border-primary/20 overflow-hidden">
                                <Image
                                    src={imageUrl}
                                    alt="Превью референса"
                                    fill
                                    sizes="(max-width: 768px) 100vw, 50vw"
                                    className="object-cover"
                                />
                            </div>
                        )}
                    </div>

                    {/* Город */}
                    <div className="space-y-3">
                        <label htmlFor="city" className="text-sm font-medium block">
                            Город
                        </label>
                        <CitySelect
                            value={city}
                            onChange={(c) => setValue("city", c as City, { shouldValidate: true })}
                            placeholder="Выбери город"
                        />
                        {errors.city && (
                            <p className="text-xs text-destructive font-medium">{errors.city.message}</p>
                        )}
                    </div>

                    {/* Теги */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium block">
                            Теги (стиль/цвет)
                        </label>
                        <TagPicker
                            selected={tags as Tag[]}
                            onToggle={(t: Tag) => {
                                const set = new Set<Tag>(tags ?? []);
                                if (set.has(t)) {
                                    set.delete(t);
                                } else {
                                    set.add(t);
                                }
                                setValue("tags", Array.from(set), { shouldValidate: true });
                            }}
                        />
                        {errors.tags && (
                            <p className="text-xs text-destructive font-medium">{errors.tags.message as string}</p>
                        )}
                        {tags.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                                Выбрано тегов: {tags.length}
                            </p>
                        )}
                    </div>

                    {/* Комментарий */}
                    <div className="space-y-3">
                        <label htmlFor="note" className="text-sm font-medium block">
                            Комментарий <span className="text-muted-foreground font-normal">(необязательно)</span>
                        </label>
                        <Textarea
                            id="note"
                            placeholder="Например: хочется более холодный нюд"
                            rows={4}
                            className="resize-none"
                            {...register("note")}
                        />
                    </div>

                    {/* Кнопка отправки */}
                    <div className="pt-2">
                        <Button 
                            type="submit" 
                            disabled={isSubmitting || createRefMutation.isPending}
                            className="w-full"
                            size="lg"
                        >
                            {createRefMutation.isPending ? "Отправляем..." : "Отправить"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
