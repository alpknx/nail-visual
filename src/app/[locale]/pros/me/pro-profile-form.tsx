"use client";

import { useTranslations } from 'next-intl';
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { upsertProProfile, CITIES, type City } from "@/lib/api";
import { Button } from "@/components/ui/button";
import CitySelect from "@/components/CitySelect";
import { toast } from "sonner";
import { useState } from "react";

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
    const t = useTranslations('pro.profile');
    const tCommon = useTranslations('common');
    const qc = useQueryClient();

    const {
        register,
        handleSubmit,
        formState: { isSubmitting },
        reset,
        setValue,
        watch,
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

    const city = watch("city");
    const [isDetectingLocation, setIsDetectingLocation] = useState(false);
    const [locationWarning, setLocationWarning] = useState<{ country: string; city: string } | null>(null);

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

    // Определение города через геолокацию
    const detectCityByLocation = async () => {
        if (!navigator.geolocation) {
            toast.error(t('geolocationNotSupported') || tCommon('geolocationNotSupported') || 'Geolocation is not supported');
            return;
        }

        setIsDetectingLocation(true);
        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                });
            });

            const res = await fetch(
                `/api/geolocation/city?lat=${position.coords.latitude}&lon=${position.coords.longitude}`
            );
            
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to determine city');
            }
            
            const data = await res.json();
            const detectedCity = data.city;
            const rawDetectedCity = data.detectedCity;

            if (detectedCity && CITIES.includes(detectedCity as City)) {
                setValue("city", detectedCity, { shouldValidate: true });
                setLocationWarning(null);
                toast.success(t('cityDetected') || tCommon('cityDetected') || `City detected: ${detectedCity}`);
            } else if (rawDetectedCity) {
                const isPoland = data.isPoland;
                const country = data.country || 'unknown';
                
                if (!isPoland) {
                    setLocationWarning({ country, city: rawDetectedCity });
                    toast.warning(
                        t('locationOutsidePoland') || tCommon('locationOutsidePoland') || 
                        `Detected location is in ${country}, outside Poland. Please select a Polish city manually.`,
                        { duration: 8000 }
                    );
                } else {
                    toast.error(
                        t('cityNotInList') || tCommon('cityNotInList') || 
                        `Detected city "${rawDetectedCity}" is not in the available cities list. Please select city manually.`,
                        { duration: 5000 }
                    );
                }
                console.log('Detected city not in list:', rawDetectedCity, 'Country:', country, 'Raw address:', data.rawAddress);
            } else {
                toast.error(t('locationDetectionFailed') || tCommon('locationDetectionFailed') || 'Failed to detect city. Please select city manually.');
            }
        } catch (error) {
            if (error instanceof GeolocationPositionError || (error as any)?.code !== undefined) {
                const geolocationError = error as GeolocationPositionError;
                switch (geolocationError.code) {
                    case 1:
                        const isPermanentlyDenied = geolocationError.message?.includes('blocked') || 
                                                   geolocationError.message?.includes('dismissed');
                        if (isPermanentlyDenied) {
                            toast.error(
                                t('geolocationBlocked') || tCommon('geolocationBlocked') || 
                                'Location access is blocked. Click the lock icon next to the URL to reset permissions, or select city manually.',
                                { duration: 6000 }
                            );
                        } else {
                            toast.error(t('geolocationDenied') || tCommon('geolocationDenied') || 'Location access denied. Please allow location access or select city manually.');
                        }
                        break;
                    case 2:
                        toast.error(t('geolocationUnavailable') || tCommon('geolocationUnavailable') || 'Location information is unavailable. Please select city manually.');
                        break;
                    case 3:
                        toast.error(t('geolocationTimeout') || tCommon('geolocationTimeout') || 'Location request timed out. Please try again or select city manually.');
                        break;
                    default:
                        toast.error(t('locationDetectionFailed') || tCommon('locationDetectionFailed') || 'Failed to detect location. Please select city manually.');
                }
            } else {
                console.error('Location detection error:', error);
                toast.error(t('locationDetectionFailed') || tCommon('locationDetectionFailed') || 'Failed to detect location. Please select city manually.');
            }
        } finally {
            setIsDetectingLocation(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Предупреждение о местоположении вне Польши */}
            {locationWarning && (
                <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 space-y-2">
                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                            <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                                {t('locationOutsidePolandTitle') || tCommon('locationOutsidePolandTitle') || 'Location outside Poland'}
                            </p>
                            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                                {t('locationOutsidePolandMessage') || tCommon('locationOutsidePolandMessage') || `Your location was detected as ${locationWarning.city}, ${locationWarning.country}. This service is available only for Polish cities. Please select a city from the list below.`}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setLocationWarning(null)}
                            className="flex-shrink-0 text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200"
                            aria-label={tCommon('close') || 'Close'}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            <div className="space-y-1">
                <label className="text-sm">{t('cityLabel')}</label>
                <div className="flex gap-2">
                    <div className="flex-1">
                        <CitySelect
                            value={city || ""}
                            onChange={(selectedCity) => setValue("city", selectedCity, { shouldValidate: true })}
                            placeholder={t('cityExample') || tCommon('selectCity')}
                        />
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={detectCityByLocation}
                        disabled={isDetectingLocation}
                        className="whitespace-nowrap"
                    >
                        {isDetectingLocation ? (tCommon('detecting') || 'Detecting...') : (tCommon('detectLocation') || '📍 Detect')}
                    </Button>
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-sm">{t('minPrice')}</label>
                <input
                    type="number"
                    inputMode="numeric"
                    className="border rounded-md h-9 px-2 w-full"
                    placeholder={t('minPriceExample')}
                    {...register("minPricePln")}
                />
            </div>

            <div className="space-y-1">
                <label className="text-sm">{t('instagram')} ({t('link')})</label>
                <input
                    className="border rounded-md h-9 px-2 w-full"
                    placeholder={t('instagramLinkPlaceholder')}
                    {...register("instagram")}
                />
            </div>

            <div className="space-y-1">
                <label className="text-sm">{t('about')}</label>
                <textarea
                    rows={4}
                    className="border rounded-md px-2 py-2 w-full"
                    placeholder={t('bioPlaceholder')}
                    {...register("bio")}
                />
            </div>

            <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting || mutation.isPending}>
                    {mutation.isPending ? tCommon('saving') : tCommon('save')}
                </Button>
            </div>
        </form>
    );
}
