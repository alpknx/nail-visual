"use client";

import { useState } from "react";
import { useGeolocationContext } from "@/contexts/GeolocationContext";
import { MapPin } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import CitySelect from "@/components/CitySelect";
import { useTranslations } from 'next-intl';
import { type City } from "@/lib/api";

export default function GeolocationDisplay() {
  const { detectedCity, detectedAddress, isDetecting, detectCity, setCity } = useGeolocationContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState<City | null>(detectedCity);
  const tCommon = useTranslations('common');

  // Синхронизируем selectedCity с detectedCity при открытии диалога
  const handleOpenDialog = () => {
    setSelectedCity(detectedCity);
    setIsDialogOpen(true);
  };

  // Не показываем, если идет определение
  if (isDetecting) {
    return null;
  }

  const hasAddress = !!detectedAddress;
  const displayCity = detectedCity || tCommon('selectCity') || 'Select city';

  const handleCityChange = (city: string) => {
    setSelectedCity(city as City);
  };

  const handleDetectLocation = async () => {
    await detectCity();
    setIsDialogOpen(false);
  };

  const handleSaveCity = () => {
    if (selectedCity) {
      setCity(selectedCity);
    }
    setIsDialogOpen(false);
  };

  return (
    <>
      <button
        onClick={handleOpenDialog}
        className="px-3 rounded-lg bg-background border shadow-lg flex items-center gap-2 h-[40px] max-w-[200px] hover:bg-muted transition-colors cursor-pointer"
      >
        <MapPin className="w-4 h-4 flex-shrink-0 text-foreground" />
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          {hasAddress ? (
            <>
              <p className="text-xs font-semibold text-foreground truncate leading-tight">
                {detectedAddress}
              </p>
              <p className="text-xs text-muted-foreground truncate leading-tight">
                {detectedCity}
              </p>
            </>
          ) : (
            <p className="text-xs font-semibold text-foreground truncate leading-tight">
              {displayCity}
            </p>
          )}
        </div>
      </button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tCommon('city') || 'City'}</DialogTitle>
            <DialogDescription>
              {tCommon('selectCityOrDetect') || 'Select a city manually or detect your location'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <CitySelect
                value={selectedCity || ""}
                onChange={handleCityChange}
                placeholder={tCommon('selectCity')}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleDetectLocation}
                disabled={isDetecting}
                className="flex-1"
              >
                {isDetecting ? tCommon('detecting') || 'Detecting...' : tCommon('detectLocation') || '📍 Detect'}
              </Button>
              <Button
                onClick={handleSaveCity}
                disabled={!selectedCity}
                className="flex-1"
              >
                {tCommon('save') || 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

