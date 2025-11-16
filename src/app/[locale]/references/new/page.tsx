"use client";

import Image from "next/image";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import { useTranslations } from 'next-intl';
import { useRouter } from "@/i18n/routing";
import { useMutation } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

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
    const sessionResult = useSession();
    const session = sessionResult?.data ?? null;
    
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
    const [isDetectingLocation, setIsDetectingLocation] = useState(false);
    const [locationWarning, setLocationWarning] = useState<{ country: string; city: string } | null>(null);

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

    // Автоматически установить город из профиля пользователя, если не выбран
    useEffect(() => {
        if (!city && session?.user) {
            // Сначала пробуем город из сессии пользователя
            const userCity = (session.user as any)?.city;
            if (userCity && CITIES.includes(userCity as City)) {
                setValue("city", userCity as City, { shouldValidate: true });
            }
        }
    }, [city, session?.user?.city, setValue]);

    // Определение города через геолокацию (опционально, если нет города в профиле)
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

            // Определяем город по координатам
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

            // API вернул город из списка CITIES или null, если совпадения нет
            if (detectedCity && CITIES.includes(detectedCity as City)) {
                setValue("city", detectedCity as City, { shouldValidate: true });
                toast.success(t('cityDetected') || tCommon('cityDetected') || `City detected: ${detectedCity}`);
            } else if (rawDetectedCity) {
                // Показываем, какой город был обнаружен, но он не в списке
                const isPoland = data.isPoland;
                const country = data.country || 'unknown';
                
                if (!isPoland) {
                    // Показываем баннер и toast-уведомление
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
            // Обработка различных типов ошибок геолокации
            if (error instanceof GeolocationPositionError || (error as any)?.code !== undefined) {
                const geolocationError = error as GeolocationPositionError;
                switch (geolocationError.code) {
                    case 1: // PERMISSION_DENIED
                        // Проверяем, заблокировано ли разрешение навсегда
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
                    case 2: // POSITION_UNAVAILABLE
                        toast.error(t('geolocationUnavailable') || tCommon('geolocationUnavailable') || 'Location information is unavailable. Please select city manually.');
                        break;
                    case 3: // TIMEOUT
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
                               <div className="flex gap-2">
                                   <div className="flex-1">
                                       <CitySelect
                                           value={city}
                                           onChange={(c) => setValue("city", c as City, { shouldValidate: true })}
                                           placeholder={tCommon('selectCity')}
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
                                       {isDetectingLocation ? (t('detecting') || tCommon('detecting') || 'Detecting...') : (t('detectLocation') || tCommon('detectLocation') || '📍 Detect')}
                                   </Button>
                               </div>
                        {errors.city && (
                            <p className="text-xs text-destructive font-medium">{errors.city.message}</p>
                        )}
                        {city && (
                            <p className="text-xs text-muted-foreground">
                                {t('showingOrdersIn') || tCommon('showingOrdersIn') || 'Selected city'}: <span className="font-medium">{city}</span>
                            </p>
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
