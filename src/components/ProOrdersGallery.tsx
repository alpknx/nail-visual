"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useTranslations } from 'next-intl';
import Image from "next/image";
import FlipModal from "@/components/FlipModal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import CitySelect from "@/components/CitySelect";
import { listReferences, createOffer, type City, type ClientReference, CITIES } from "@/lib/api";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { CheckCircle } from "lucide-react";

export default function ProOrdersGallery() {
  const t = useTranslations('offers.pro');
  const tCommon = useTranslations('common');
  const sessionResult = useSession();
  const session = sessionResult?.data ?? null;
  const searchParams = useSearchParams();
  const initialCity = (searchParams.get("city") as City | null) || undefined;
  const [selectedCity, setSelectedCity] = useState<City | undefined>(initialCity);
  
  // Загрузить профиль мастера для получения города
  const { data: proProfile } = useQuery({
    queryKey: ["pro-profile", session?.user?.id],
    queryFn: async () => {
      const res = await fetch("/api/pros/me");
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!session?.user?.id && session?.user?.role === "pro",
  });

  // Автоматически установить город из профиля пользователя, если не выбран
  useEffect(() => {
    if (!selectedCity && session?.user) {
      // Сначала пробуем город из сессии пользователя
      const userCity = (session.user as any)?.city;
      if (userCity && CITIES.includes(userCity as City)) {
        setSelectedCity(userCity as City);
        return;
      }
    }
  }, [selectedCity, session]);

  const [selectedRef, setSelectedRef] = useState<ClientReference | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationWarning, setLocationWarning] = useState<{ country: string; city: string } | null>(null);
  const [formData, setFormData] = useState({
    message: "",
    pricePln: "",
  });

  // Определение города через геолокацию (опционально, если нет города в профиле)
  const detectCityByLocation = async () => {
    if (!navigator.geolocation) {
      toast.error(t('geolocationNotSupported') || 'Geolocation is not supported');
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
        setSelectedCity(detectedCity as City);
        toast.success(t('cityDetected') || `City detected: ${detectedCity}`);
      } else if (rawDetectedCity) {
        // Показываем, какой город был обнаружен, но он не в списке
        const isPoland = data.isPoland;
        const country = data.country || 'unknown';
        
        if (!isPoland) {
          // Показываем баннер и toast-уведомление
          setLocationWarning({ country, city: rawDetectedCity });
          toast.warning(
            t('locationOutsidePoland') || 
            `Detected location is in ${country}, outside Poland. Please select a Polish city manually.`,
            { duration: 8000 }
          );
        } else {
          toast.error(
            t('cityNotInList') || 
            `Detected city "${rawDetectedCity}" is not in the available cities list. Please select city manually.`,
            { duration: 5000 }
          );
        }
        console.log('Detected city not in list:', rawDetectedCity, 'Country:', country, 'Raw address:', data.rawAddress);
      } else {
        toast.error(t('locationDetectionFailed') || 'Failed to detect city. Please select city manually.');
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
                t('geolocationBlocked') || 'Location access is blocked. Click the lock icon next to the URL to reset permissions, or select city manually.',
                { duration: 6000 }
              );
            } else {
              toast.error(t('geolocationDenied') || 'Location access denied. Please allow location access or select city manually.');
            }
            break;
          case 2: // POSITION_UNAVAILABLE
            toast.error(t('geolocationUnavailable') || 'Location information is unavailable. Please select city manually.');
            break;
          case 3: // TIMEOUT
            toast.error(t('geolocationTimeout') || 'Location request timed out. Please try again or select city manually.');
            break;
          default:
            toast.error(t('locationDetectionFailed') || 'Failed to detect location. Please select city manually.');
        }
      } else {
        console.error('Location detection error:', error);
        toast.error(t('locationDetectionFailed') || 'Failed to detect location. Please select city manually.');
      }
    } finally {
      setIsDetectingLocation(false);
    }
  };

  // Загрузить все референсы (отфильтрованные по городу)
  const { data: references = [], isLoading } = useQuery({
    queryKey: ["references", selectedCity],
    queryFn: () => listReferences({ city: selectedCity, limit: 100 }),
  });

  // Фильтруем только открытые референсы
  const openReferences = references.filter(
    (ref: ClientReference) => ref.status === "open"
  );

  const handleOpenModal = (ref: ClientReference) => {
    setSelectedRef(ref);
    setFormData({
      message: "",
      pricePln: "",
    });
  };

  const handleCloseModal = () => {
    setSelectedRef(null);
  };

  const handleSubmit = async () => {
    if (!selectedRef) return;

    if (!session) {
      toast.error(t('needSignIn'));
      return;
    }

    setIsSubmitting(true);
    try {
      await createOffer({
        refId: selectedRef.id,
        message: formData.message || undefined,
        pricePln: formData.pricePln ? parseInt(formData.pricePln, 10) : undefined,
      });
      toast.success(t('sent'));
      setSelectedRef(null);
      // Обновить список
      window.location.reload();
    } catch (error) {
      toast.error(t('error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="sticky top-0 bg-background z-10 pb-4">
          <CitySelect
            value={selectedCity}
            onChange={(city) => setSelectedCity(city as City)}
            placeholder={tCommon('allCities')}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
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
                  {t('locationOutsidePolandTitle') || 'Location outside Poland'}
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  {t('locationOutsidePolandMessage') || `Your location was detected as ${locationWarning.city}, ${locationWarning.country}. This service is available only for Polish cities. Please select a city from the list below.`}
                </p>
              </div>
              <button
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
        
        {/* Фильтр по городу */}
        <div className="sticky top-0 bg-background z-10 pb-4 space-y-2">
          <div className="flex gap-2">
            <div className="flex-1">
              <CitySelect
                value={selectedCity}
                onChange={(city) => setSelectedCity(city as City)}
                placeholder={tCommon('allCities')}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={detectCityByLocation}
              disabled={isDetectingLocation}
              className="whitespace-nowrap"
            >
              {isDetectingLocation ? t('detecting') || 'Detecting...' : t('detectLocation') || '📍 Detect'}
            </Button>
          </div>
          {selectedCity && (
            <p className="text-xs text-muted-foreground">
              {t('showingOrdersIn') || 'Showing orders in'}: <span className="font-medium">{selectedCity}</span>
            </p>
          )}
        </div>

        {/* Галерея заказов */}
        {openReferences.length === 0 ? (
          <p className="text-center py-12 opacity-70">
            {t('noOpenOrders')}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 pb-4">
            {openReferences.map((ref: ClientReference, index: number) => (
              <div
                key={ref.id}
                className="relative aspect-[3/4] rounded-lg overflow-hidden group cursor-pointer"
                onClick={() => handleOpenModal(ref)}
              >
                <Image
                  src={ref.imageUrl}
                  alt={ref.note || tCommon('order')}
                  fill
                  sizes="50vw"
                  className="object-cover"
                  priority={index < 2}
                />
                {/* Кнопка МОГУ */}
                <button
                  className="absolute top-2 right-2 z-10 p-2 rounded-full bg-primary/90 text-primary-foreground hover:bg-primary transition-colors shadow-lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenModal(ref);
                  }}
                  aria-label={t('canDo')}
                >
                  <CheckCircle className="w-5 h-5 fill-current" />
                </button>
                {/* Город и теги */}
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent text-white text-xs">
                  <p className="font-medium">{ref.city}</p>
                  {ref.tags && ref.tags.length > 0 && (
                    <p className="opacity-90">{ref.tags.slice(0, 2).join(", ")}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedRef && (
        <FlipModal
          isOpen={!!selectedRef}
          onClose={handleCloseModal}
          imageUrl={selectedRef.imageUrl}
          title={t('title')}
          onSubmit={handleSubmit}
          submitLabel={tCommon('submit')}
          submitDisabled={isSubmitting}
        >
          <div className="space-y-4">
            {selectedRef.note && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {t('orderDescription')}
                </label>
                <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                  {selectedRef.note}
                </p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">
                {t('pricePln')}
              </label>
              <Input
                type="number"
                placeholder={t('priceExample')}
                value={formData.pricePln}
                onChange={(e) =>
                  setFormData({ ...formData, pricePln: e.target.value })
                }
                min="0"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                {t('description')}
              </label>
              <Textarea
                placeholder={t('descriptionExample')}
                value={formData.message}
                onChange={(e) =>
                  setFormData({ ...formData, message: e.target.value })
                }
                rows={4}
              />
            </div>
          </div>
        </FlipModal>
      )}
    </>
  );
}
