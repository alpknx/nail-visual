"use client";

import { useSession } from "next-auth/react";
import { useTranslations } from 'next-intl';
import { useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CitySelect from "@/components/CitySelect";
import { toast } from "sonner";
import { CITIES, type City } from "@/lib/api";

// Prevent static generation - this page requires authentication
export const dynamic = 'force-dynamic';

export default function ClientProfilePage() {
  const t = useTranslations('profile');
  const tCommon = useTranslations('common');
  const sessionResult = useSession();
  const session = sessionResult?.data ?? null;
  const updateSession = sessionResult?.update;
  const user = session?.user as { id: string; name?: string; email?: string; image?: string; phone?: string; city?: string; role: string };
  const [formData, setFormData] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    city: user?.city || "",
  });
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationWarning, setLocationWarning] = useState<{ country: string; city: string } | null>(null);

  // Автоматически установить город из профиля пользователя при загрузке
  useEffect(() => {
    if (user?.city && CITIES.includes(user.city as City)) {
      setFormData(prev => ({ ...prev, city: user.city || "" }));
    }
  }, [user?.city]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: async () => {
      toast.success(t('updated'));
      if (updateSession) {
        await updateSession();
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

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
        setFormData(prev => ({ ...prev, city: detectedCity }));
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (!session) {
    return <p className="text-center py-12 opacity-70">{t('needAuth')}</p>;
  }

  return (
    <section className="max-w-md mx-auto py-8 pt-16 md:pt-8 px-4">
      <h1 className="text-2xl font-semibold mb-6">{t('title')}</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
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

        <div>
          <label className="block text-sm font-medium mb-1">{t('nameLabel')}</label>
          <Input
            type="text"
            placeholder={t('namePlaceholder')}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{t('phoneLabel')}</label>
          <Input
            type="tel"
            placeholder={t('phonePlaceholder')}
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{t('cityLabel')}</label>
          <div className="flex gap-2">
            <div className="flex-1">
              <CitySelect
                value={formData.city}
                onChange={(city) => setFormData({ ...formData, city })}
                placeholder={t('cityPlaceholder') || tCommon('selectCity')}
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

        <div className="pt-4">
          <Button
            type="submit"
            disabled={updateMutation.isPending}
            className="w-full"
          >
            {updateMutation.isPending ? tCommon('saving') : tCommon('save')}
          </Button>
        </div>

        <p className="text-xs opacity-70 text-center">
          Email: {session.user?.email}
        </p>
      </form>
    </section>
  );
}
