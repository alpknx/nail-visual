"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "konsta/react";
import { MapPin, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import ContactButtons from "@/components/ContactButtons";
import BookingModal from "@/components/BookingModal";
import { useSession } from "next-auth/react";

interface MasterMatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  master: {
    masterId: string;
    businessName: string;
    avatarUrl?: string | null;
    distance: number;
    price?: number | null;
    currency?: string | null;
    durationMinutes?: number | null;
    phoneNumber: string;
    phoneCountryCode: string | null;
    matchingImageUrl: string | null;
    matchingPostId?: string | null;
  };
}

export default function MasterMatchDialog({
  open,
  onOpenChange,
  master,
}: MasterMatchDialogProps) {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle swipe down to close
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const minSwipeDistance = 80; // Increased threshold

  const modalRef = useRef<HTMLDivElement>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const modal = modalRef.current;
    
    // Only allow swipe down if modal is scrolled to top or on drag handle
    if (modal && modal.scrollTop > 0 && !(e.target as HTMLElement).closest('[data-drag-handle]')) {
      return; // Don't handle swipe if content is scrolled
    }
    
    setTouchEnd(null);
    setTouchStart(touch.clientY);
    setIsDragging(false);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const touch = e.touches[0];
    const currentY = touch.clientY;
    const deltaY = currentY - touchStart;
    const modal = modalRef.current;
    
    // Only handle swipe down if modal is at top or on drag handle
    if (modal && modal.scrollTop > 0 && !(e.target as HTMLElement).closest('[data-drag-handle]')) {
      return;
    }
    
    setTouchEnd(currentY);
    
    // If swiping down (positive delta), prevent default to avoid pull-to-refresh
    if (deltaY > 0) {
      setIsDragging(true);
      // Always prevent default when dragging down to avoid pull-to-refresh
      e.preventDefault();
      e.stopPropagation();
    } else {
      // If swiping up, allow normal scroll
      setIsDragging(false);
    }
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      setTouchStart(null);
      setTouchEnd(null);
      setIsDragging(false);
      return;
    }
    
    const distance = touchEnd - touchStart; // Positive = down swipe
    const isDownSwipe = distance > minSwipeDistance;
    
    if (isDownSwipe) {
      onOpenChange(false);
    }
    
    setTouchStart(null);
    setTouchEnd(null);
    setIsDragging(false);
  };

  // Light scroll prevention - don't block browser navigation
  useEffect(() => {
    if (open) {
      // Only prevent scroll on modal content, not entire body
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open || !mounted) return null;

  const modalContent = (
    <>
      {/* Backdrop/Overlay - Light, non-blocking, allows swipe back */}
      <div
        className="fixed left-0 right-0 top-0 bg-black/20 z-[9998]"
        onClick={() => onOpenChange(false)}
        style={{
          bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))', // Don't cover bottom navigation + safe area
          animation: 'fadeIn 0.2s ease-out',
          WebkitBackdropFilter: 'blur(0px)',
          backdropFilter: 'blur(0px)',
          pointerEvents: 'auto',
          touchAction: 'pan-y', // Allow vertical gestures for browser navigation
        }}
        aria-hidden="true"
      />
      
      {/* Modal Content - Slides up from bottom */}
      <div
        ref={modalRef}
        className="fixed left-1/2 bg-white rounded-t-3xl z-[9999] max-h-[85vh] overflow-y-auto w-full max-w-md"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          bottom: 'calc(60px + env(safe-area-inset-bottom, 0px))', // Moved down 40px total (was 100px, now 60px)
          transform: open 
            ? (isDragging && touchStart && touchEnd 
                ? `translate(-50%, ${Math.max(0, touchEnd - touchStart)}px)` 
                : 'translate(-50%, 0)')
            : 'translate(-50%, calc(100% + 60px + env(safe-area-inset-bottom, 0px)))',
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)',
          touchAction: 'pan-y', // Allow vertical scrolling
          overscrollBehavior: 'contain', // Prevent pull-to-refresh
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Drag Handle - Swipe down area */}
        <div 
          data-drag-handle
          className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
          style={{
            userSelect: 'none',
            WebkitUserSelect: 'none',
            touchAction: 'none', // Disable all touch actions on drag handle
          }}
        >
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
        <div className="p-4 bg-white border-t border-gray-100 space-y-2" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
          {session?.user?.role === "client" && master.matchingPostId && master.durationMinutes && (
            <Button large className="w-full" onClick={() => setBookingOpen(true)}>
              Book Appointment
            </Button>
          )}
          <ContactButtons
            phoneNumber={master.phoneNumber}
            phoneCountryCode={master.phoneCountryCode}
          />
        </div>
      </div>

      {bookingOpen && master.matchingPostId && (
        <BookingModal
          open={bookingOpen}
          onOpenChange={setBookingOpen}
          masterId={master.masterId}
          postId={master.matchingPostId}
          masterName={master.businessName}
          masterAvatarUrl={master.avatarUrl}
          price={master.price}
          currency={master.currency}
          durationMinutes={master.durationMinutes}
        />
      )}
    </>
  );

  return createPortal(modalContent, document.body);
}
