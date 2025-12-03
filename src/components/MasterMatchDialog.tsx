"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "konsta/react";
import { MapPin, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import ContactButtons from "@/components/ContactButtons";

interface MasterMatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  master: {
    masterId: string;
    businessName: string;
    avatarUrl?: string | null;
    distance: number;
    price?: number | null;
    phoneNumber: string;
    phoneCountryCode: string | null;
    matchingImageUrl: string | null;
  };
}

export default function MasterMatchDialog({
  open,
  onOpenChange,
  master,
}: MasterMatchDialogProps) {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      // Prevent iOS Safari bounce scroll
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.documentElement.style.overflow = '';
    };
  }, [open]);

  if (!open || !mounted) return null;

  const modalContent = (
    <>
      {/* Backdrop/Overlay - Don't cover bottom navigation */}
      <div
        className="fixed left-0 right-0 top-0 bg-black/50 z-[9998]"
        onClick={() => onOpenChange(false)}
        style={{
          bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))', // Don't cover bottom navigation + safe area
          animation: 'fadeIn 0.2s ease-out',
          WebkitBackdropFilter: 'blur(0px)',
          backdropFilter: 'blur(0px)',
        }}
        aria-hidden="true"
      />
      
      {/* Modal Content - Slides up from bottom */}
      <div
        className="fixed left-1/2 bg-white rounded-t-3xl z-[9999] max-h-[85vh] overflow-y-auto w-full max-w-md"
        style={{
          bottom: 'calc(100px + env(safe-area-inset-bottom, 0px))', // Increased space above bottom navigation + safe area
          transform: open 
            ? 'translate(-50%, 0)' 
            : 'translate(-50%, calc(100% + 100px + env(safe-area-inset-bottom, 0px)))',
          transition: 'transform 0.3s ease-out',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)'
        }}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header - Clickable to Profile */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-start">
          <Link 
            href={`/${locale}/master/${master.masterId}`} 
            className="flex items-center gap-3 hover:opacity-80 transition-opacity flex-1"
          >
            <div className="h-12 w-12 rounded-full overflow-hidden bg-gray-100 border border-gray-200 relative flex-shrink-0">
              {master.avatarUrl ? (
                <Image src={master.avatarUrl} alt={master.businessName} fill className="object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full w-full bg-gray-200 text-gray-500 font-bold">
                  {master.businessName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-lg leading-tight truncate">{master.businessName}</h3>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span>{master.distance.toFixed(1)} km away</span>
              </div>
            </div>
          </Link>
          <Button
            clear
            small
            className="!p-0 min-w-0 w-8 h-8 rounded-full flex-shrink-0 ml-2"
            onClick={() => onOpenChange(false)}
          >
            <X className="w-5 h-5 text-gray-400" />
          </Button>
        </div>

        {/* Matched Image */}
        <div className="relative aspect-[4/5] w-full bg-gray-100">
          {master.matchingImageUrl ? (
            <Image
              src={master.matchingImageUrl}
              alt={`Work by ${master.businessName}`}
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              No image available
            </div>
          )}

          {/* Price Tag Overlay */}
          {master.price && (
            <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-sm font-medium">
              {master.price} PLN
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-gray-100" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
          <ContactButtons
            phoneNumber={master.phoneNumber}
            phoneCountryCode={master.phoneCountryCode}
          />
        </div>
      </div>
    </>
  );

  // Render modal using portal to body for proper z-index stacking in Safari
  return createPortal(modalContent, document.body);
}
