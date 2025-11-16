"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CITIES, type City } from '@/lib/api';

interface GeolocationContextType {
  detectedCity: City | null;
  detectedAddress: string | null;
  isDetecting: boolean;
  locationWarning: { country: string; city: string } | null;
  detectCity: () => Promise<void>;
  setCity: (city: City | null) => void;
  clearWarning: () => void;
}

const GeolocationContext = createContext<GeolocationContextType | undefined>(undefined);

export function GeolocationProvider({ children }: { children: React.ReactNode }) {
  const [detectedCity, setDetectedCity] = useState<City | null>(null);
  const [detectedAddress, setDetectedAddress] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [locationWarning, setLocationWarning] = useState<{ country: string; city: string } | null>(null);
  const { data: session } = useSession();
  const tCommon = useTranslations('common');

  const detectCity = useCallback(async () => {
    if (!navigator.geolocation) {
      toast.error(tCommon('geolocationNotSupported') || 'Geolocation is not supported');
      return;
    }

    setIsDetecting(true);
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
      const city = data.city;
      const rawDetectedCity = data.detectedCity;
      const rawAddress = data.rawAddress;

      // Формируем адрес из данных Nominatim
      let address = null;
      if (rawAddress) {
        const street = rawAddress.road || rawAddress.street;
        const houseNumber = rawAddress.house_number;
        if (street) {
          address = houseNumber ? `${street} ${houseNumber}` : street;
        }
      }

      // API вернул город из списка CITIES или null, если совпадения нет
      if (city && CITIES.includes(city as City)) {
        setDetectedCity(city as City);
        setDetectedAddress(address);
        setLocationWarning(null);
        toast.success(`${tCommon('cityDetected') || 'City detected'}: ${city}`);
      } else if (rawDetectedCity) {
        // Показываем, какой город был обнаружен, но он не в списке
        const isPoland = data.isPoland;
        const country = data.country || 'unknown';
        
        if (!isPoland) {
          // Показываем баннер и toast-уведомление
          setLocationWarning({ country, city: rawDetectedCity });
          toast.warning(
            tCommon('locationOutsidePoland') || 
            `Detected location is in ${country}, outside Poland. Please select a Polish city manually.`,
            { duration: 8000 }
          );
        } else {
          toast.error(
            tCommon('cityNotInList') || 
            `Detected city "${rawDetectedCity}" is not in the available cities list. Please select city manually.`,
            { duration: 5000 }
          );
        }
      } else {
        toast.error(tCommon('locationDetectionFailed') || 'Failed to detect city. Please select city manually.');
      }
    } catch (error) {
      // Обработка различных типов ошибок геолокации
      if (error instanceof GeolocationPositionError || (error as any)?.code !== undefined) {
        const geolocationError = error as GeolocationPositionError;
        switch (geolocationError.code) {
          case 1: // PERMISSION_DENIED
            const isPermanentlyDenied = geolocationError.message?.includes('blocked') || 
                                       geolocationError.message?.includes('dismissed');
            if (isPermanentlyDenied) {
              toast.error(
                tCommon('geolocationBlocked') || 'Location access is blocked. Click the lock icon next to the URL to reset permissions, or select city manually.',
                { duration: 6000 }
              );
            } else {
              toast.error(tCommon('geolocationDenied') || 'Location access denied. Please allow location access or select city manually.');
            }
            break;
          case 2: // POSITION_UNAVAILABLE
            toast.error(tCommon('geolocationUnavailable') || 'Location information is unavailable. Please select city manually.');
            break;
          case 3: // TIMEOUT
            toast.error(tCommon('geolocationTimeout') || 'Location request timed out. Please try again or select city manually.');
            break;
          default:
            toast.error(tCommon('locationDetectionFailed') || 'Failed to detect location. Please select city manually.');
        }
      } else {
        console.error('Location detection error:', error);
        toast.error(tCommon('locationDetectionFailed') || 'Failed to detect location. Please select city manually.');
      }
    } finally {
      setIsDetecting(false);
    }
  }, [tCommon]);

  const setCity = useCallback((city: City | null) => {
    setDetectedCity(city);
    if (!city) {
      setDetectedAddress(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('detectedCity');
        localStorage.removeItem('detectedAddress');
      }
    } else {
      if (typeof window !== 'undefined') {
        localStorage.setItem('detectedCity', city);
      }
    }
  }, []);

  const clearWarning = useCallback(() => {
    setLocationWarning(null);
  }, []);

  // Автоматически определяем город при первой загрузке, если нет города в сессии
  useEffect(() => {
    // Проверяем, есть ли уже сохраненный город в localStorage
    const savedCity = typeof window !== 'undefined' ? localStorage.getItem('detectedCity') : null;
    if (savedCity && CITIES.includes(savedCity as City)) {
      setDetectedCity(savedCity as City);
      // Восстанавливаем адрес, если он есть
      const savedAddress = typeof window !== 'undefined' ? localStorage.getItem('detectedAddress') : null;
      if (savedAddress) {
        setDetectedAddress(savedAddress);
      }
      return;
    }

    // Проверяем город из сессии пользователя
    const userCity = (session?.user as any)?.city;
    if (userCity && CITIES.includes(userCity as City)) {
      setDetectedCity(userCity as City);
      if (typeof window !== 'undefined') {
        localStorage.setItem('detectedCity', userCity);
      }
      return;
    }

    // Автоматически определяем город при первой загрузке (только один раз)
    const hasDetectedBefore = typeof window !== 'undefined' ? localStorage.getItem('hasDetectedLocation') : null;
    if (!hasDetectedBefore && typeof window !== 'undefined') {
      // Небольшая задержка, чтобы не блокировать первоначальную загрузку
      const timer = setTimeout(() => {
        detectCity();
        localStorage.setItem('hasDetectedLocation', 'true');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [session, detectCity]);

  // Сохраняем определенный город и адрес в localStorage
  useEffect(() => {
    if (detectedCity && typeof window !== 'undefined') {
      localStorage.setItem('detectedCity', detectedCity);
      if (detectedAddress) {
        localStorage.setItem('detectedAddress', detectedAddress);
      }
    }
  }, [detectedCity, detectedAddress]);

  // Восстанавливаем адрес из localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && detectedCity) {
      const savedAddress = localStorage.getItem('detectedAddress');
      if (savedAddress && !detectedAddress) {
        setDetectedAddress(savedAddress);
      }
    }
  }, [detectedCity, detectedAddress]);

  return (
    <GeolocationContext.Provider
      value={{
        detectedCity,
        detectedAddress,
        isDetecting,
        locationWarning,
        detectCity,
        setCity,
        clearWarning,
      }}
    >
      {children}
    </GeolocationContext.Provider>
  );
}

export function useGeolocationContext() {
  const context = useContext(GeolocationContext);
  if (context === undefined) {
    throw new Error('useGeolocationContext must be used within a GeolocationProvider');
  }
  return context;
}

