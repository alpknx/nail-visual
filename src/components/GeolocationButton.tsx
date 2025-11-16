"use client";

import { Button } from "@/components/ui/button";
import { useGeolocationContext } from "@/contexts/GeolocationContext";
import { useTranslations } from 'next-intl';

interface GeolocationButtonProps {
  variant?: "default" | "outline" | "ghost" | "link" | "destructive" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export default function GeolocationButton({ 
  variant = "outline", 
  size = "sm",
  className = ""
}: GeolocationButtonProps) {
  const { isDetecting, detectCity } = useGeolocationContext();
  const tCommon = useTranslations('common');

  return (
    <Button
      variant={variant}
      size={size}
      onClick={detectCity}
      disabled={isDetecting}
      className={`whitespace-nowrap ${className}`}
    >
      {isDetecting ? tCommon('detecting') || 'Detecting...' : tCommon('detectLocation') || '📍 Detect'}
    </Button>
  );
}

