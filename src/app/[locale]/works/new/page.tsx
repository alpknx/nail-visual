/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useState } from "react";
import { useTranslations } from 'next-intl';
import { useRouter } from "@/i18n/routing";
import Image from "next/image";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import UtDropzone from "@/components/UtDropzone";

import { toast } from "sonner";
import { posthog } from "@/lib/analytics";
import { useGeolocationContext } from "@/contexts/GeolocationContext";

import { type City, createWorkViaApi } from "@/lib/api";

export default function NewWorkPage() {
    const t = useTranslations('works.new');
    const tCommon = useTranslations('common');
    const router = useRouter();
    const qc = useQueryClient();
    
    const schema = z.object({
        caption: z.string().max(200).optional().or(z.literal("")),
    });
    type FormData = z.infer<typeof schema>;

    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const { detectedCity } = useGeolocationContext();

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: { caption: "" },
    });

    const createWorkMutation = useMutation({
        mutationFn: (input: {
            imageUrl: string;
            caption?: string | null;
            city?: City | null;
            tags?: string[];
        }) => createWorkViaApi(input),
        onSuccess: async (created) => {
            posthog.capture("create_work", {
                city: created.city,
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
        if (!detectedCity) {
            toast.error(tCommon('selectCity') || 'Please select a city');
            return;
        }
        await createWorkMutation.mutateAsync({
            imageUrl,
            caption: data.caption || undefined,
            city: detectedCity,
            tags: [],
        });
    };

    return (
        <section className="max-w-2xl mx-auto space-y-6 pt-16 md:pt-4 px-4">
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


                {/* Подпись */}
                <div className="space-y-2">
                    <label className="text-sm">{t('caption')} ({tCommon('optional')})</label>
                    <Textarea
                        placeholder={t('captionPlaceholder')}
                        {...register("caption")}
                    />
                </div>

                {!detectedCity && (
                    <p className="text-xs text-muted-foreground">
                        {tCommon('selectCity') || 'Please select a city to continue'}
                    </p>
                )}
                <div className="flex gap-2">
                    <Button
                        type="submit"
                        disabled={isSubmitting || createWorkMutation.isPending || !imageUrl || !detectedCity}
                    >
                        {createWorkMutation.isPending ? t('submitting') : t('submit')}
                    </Button>
                </div>
            </form>
        </section>
    );
}
