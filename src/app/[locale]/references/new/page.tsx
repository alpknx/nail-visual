"use client";

import Image from "next/image";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useTranslations } from 'next-intl';
import { useRouter } from "@/i18n/routing";
import { useMutation } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import CitySelect from "@/components/CitySelect";
import TagPicker from "@/components/TagPicker";
import UtDropzone from "@/components/UtDropzone";
import { CITIES, TAGS, type City, type Tag, createReference } from "@/lib/api";
import { toast } from "sonner";
import { posthog } from "@/lib/analytics";

export default function NewReferencePage() {
    const t = useTranslations('references.new');
    const tCommon = useTranslations('common');
    const router = useRouter();
    
    // --- Zod enums из tuple литералов, чтобы получить строгие City/Tag ---
    const CityEnum = z.enum(CITIES as unknown as [typeof CITIES[number], ...typeof CITIES[number][]]);
    const TagEnum  = z.enum(TAGS as unknown  as [typeof TAGS[number],  ...typeof TAGS[number][]]);

    const schema = z.object({
        note: z.string().max(200).optional().or(z.literal("")),
        city: CityEnum,
        tags: z.array(TagEnum).min(1, t('addAtLeastOneTag')),
    });
    type FormData = z.infer<typeof schema>;
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
            toast.success(t('created'));
            router.push("/");
        },
        onError: () => {
            toast.error(t('error'));
        },
    });

    const onSubmit = async (data: FormData) => {
        if (!imageUrl) {
            toast.error(t('addPhoto'));
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
                    <h1 className="text-2xl font-bold">{t('title')}</h1>
                    <p className="text-sm text-muted-foreground">
                        {t('subtitle')}
                    </p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Фото-референс */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium block">
                            {t('photo')}
                        </label>
                        <UtDropzone onUrl={setImageUrl} />
                        {imageUrl && (
                            <div className="relative w-full aspect-square max-w-md mx-auto rounded-lg border-2 border-primary/20 overflow-hidden">
                                <Image
                                    src={imageUrl}
                                    alt={t('preview')}
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
                            {t('city')}
                        </label>
                        <CitySelect
                            value={city}
                            onChange={(c) => setValue("city", c as City, { shouldValidate: true })}
                            placeholder={tCommon('selectCity')}
                        />
                        {errors.city && (
                            <p className="text-xs text-destructive font-medium">{errors.city.message}</p>
                        )}
                    </div>

                    {/* Теги */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium block">
                            {t('tags')}
                        </label>
                        <TagPicker
                            selected={tags as Tag[]}
                            onToggle={(tag: Tag) => {
                                const set = new Set<Tag>(tags ?? []);
                                if (set.has(tag)) {
                                    set.delete(tag);
                                } else {
                                    set.add(tag);
                                }
                                setValue("tags", Array.from(set), { shouldValidate: true });
                            }}
                        />
                        {errors.tags && (
                            <p className="text-xs text-destructive font-medium">{errors.tags.message as string}</p>
                        )}
                        {tags.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                                {t('selectedTags')}: {tags.length}
                            </p>
                        )}
                    </div>

                    {/* Комментарий */}
                    <div className="space-y-3">
                        <label htmlFor="note" className="text-sm font-medium block">
                            {t('comment')} <span className="text-muted-foreground font-normal">({tCommon('optional')})</span>
                        </label>
                        <Textarea
                            id="note"
                            placeholder={t('example')}
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
                            {createRefMutation.isPending ? t('submitting') : t('submit')}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
