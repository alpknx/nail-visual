/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useMemo, useState } from "react";
import { useTranslations } from 'next-intl';
import { useRouter } from "@/i18n/routing";
import Image from "next/image";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import CitySelect from "@/components/CitySelect";
import TagPicker from "@/components/TagPicker";
import UtDropzone from "@/components/UtDropzone";

import { toast } from "sonner";
import { posthog } from "@/lib/analytics";

import { type City, type Tag, TAGS, createWorkViaApi } from "@/lib/api";

export default function NewWorkPage() {
    const t = useTranslations('works.new');
    const tCommon = useTranslations('common');
    const router = useRouter();
    const qc = useQueryClient();
    
    const schema = z.object({
        caption: z.string().max(200).optional().or(z.literal("")),
        city: z.string().min(1, t('cityRequired')),
        tags: z.array(z.string()).min(1, t('tagsRequired')),
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
        defaultValues: { caption: "", city: "", tags: [] },
    });

    const selectedTags: Tag[] = useMemo(() => {
        const allow = new Set<string>(TAGS as readonly string[]);
        const raw = watch("tags") ?? [];
        return raw.filter((t) => allow.has(t)) as Tag[];
    }, [watch("tags")]);

    const createWorkMutation = useMutation({
        mutationFn: (input: {
            imageUrl: string;
            caption?: string | null;
            city?: City | null;
            tags?: Tag[];
        }) => createWorkViaApi(input),
        onSuccess: async (created) => {
            posthog.capture("create_work", {
                city: created.city,
                tags: created.tags,
            });
            await qc.invalidateQueries({ queryKey: ["works"] });
            toast.success(t('added'));
            router.push("/");
        },
        onError: (e: unknown) => {
            const msg = e instanceof Error ? e.message : t('saveError');
            toast.error(msg);
        },
    });

    const onSubmit = async (data: FormData) => {
        if (!imageUrl) {
            toast.error(t('uploadPhotoFirst'));
            return;
        }
        await createWorkMutation.mutateAsync({
            imageUrl,
            caption: data.caption || undefined,
            city: data.city as City,
            tags: selectedTags,
        });
    };

    return (
        <section className="max-w-2xl mx-auto space-y-6">
            <h1 className="text-2xl font-semibold">{t('title')}</h1>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Фото */}
                <div className="space-y-2">
                    <label className="text-sm">{t('photo')}</label>
                    <UtDropzone onUrl={(url: string) => setImageUrl(url)} />
                    <p className="text-xs text-muted-foreground">{t('photoFormat')}</p>

                    {imageUrl && (
                        <div className="relative w-48 h-60 rounded-xl overflow-hidden border bg-muted">
                            <Image src={imageUrl} alt="" fill className="object-cover" unoptimized />
                        </div>
                    )}
                </div>

                {/* Город */}
                <div className="space-y-2">
                    <label className="text-sm">{t('city')}</label>
                    <CitySelect
                        value={(watch("city") as string) || ""}
                        onChange={(c: string) => setValue("city", c as City)}
                        placeholder={tCommon('selectCity')}
                    />
                    {errors.city && (
                        <p className="text-xs text-red-500">{errors.city.message}</p>
                    )}
                </div>

                {/* Теги */}
                <div className="space-y-2">
                    <label className="text-sm">{t('tags')}</label>
                    <TagPicker
                        selected={selectedTags}
                        onToggle={(tag: Tag) => {
                            const set = new Set<Tag>(selectedTags);
                            if (set.has(tag)) {
                                set.delete(tag);
                            } else {
                                set.add(tag);
                            }
                            setValue("tags", Array.from(set) as unknown as string[]);
                        }}
                    />
                    {errors.tags && (
                        <p className="text-xs text-red-500">
                            {String(errors.tags.message)}
                        </p>
                    )}
                </div>

                {/* Подпись */}
                <div className="space-y-2">
                    <label className="text-sm">{t('caption')} ({tCommon('optional')})</label>
                    <Textarea
                        placeholder={t('captionPlaceholder')}
                        {...register("caption")}
                    />
                </div>

                <div className="flex gap-2">
                    <Button
                        type="submit"
                        disabled={isSubmitting || createWorkMutation.isPending || !imageUrl}
                    >
                        {createWorkMutation.isPending ? t('submitting') : t('submit')}
                    </Button>
                </div>
            </form>
        </section>
    );
}
