"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, Clock } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useBookingFlow } from "@/hooks/use-booking-flow";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import BookingModalDateStep from "@/components/BookingModalDateStep";
import BookingModalTimeSlotStep from "@/components/BookingModalTimeSlotStep";
import BookingModalNotesStep from "@/components/BookingModalNotesStep";
import BookingModalConfirmStep from "@/components/BookingModalConfirmStep";
import BookingModalSuccessStep from "@/components/BookingModalSuccessStep";

interface BookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  masterId: string;
  postId: string;
  masterName: string;
  masterAvatarUrl?: string | null;
  price?: number | null;
  currency?: string | null;
  durationMinutes?: number | null;
}

export default function BookingModal({
  open,
  onOpenChange,
  masterId,
  postId,
  masterName,
  masterAvatarUrl,
  price,
  currency,
  durationMinutes,
}: BookingModalProps) {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || "en";

  const [mounted, setMounted] = useState(false);

  const {
    step,
    setStep,
    timezone,
    selectedDate,
    slots,
    loadingSlots,
    notes,
    setNotes,
    isGuest,
    guestName,
    setGuestName,
    guestPhone,
    setGuestPhone,
    preview,
    previewing,
    submitting,
    bookingId,
    handleDateSelect,
    handleSlotSelect,
    handleNotesNext,
    handleConfirm,
  } = useBookingFlow({ open, masterId, postId });

  const modalRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Swipe-down to close
  const onTouchStart = (e: React.TouchEvent) => {
    const modal = modalRef.current;
    if (modal && modal.scrollTop > 0) return;
    setTouchEnd(null);
    setTouchStart(e.touches[0].clientY);
    setIsDragging(false);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const modal = modalRef.current;
    if (modal && modal.scrollTop > 0) return;
    const delta = e.touches[0].clientY - touchStart;
    setTouchEnd(e.touches[0].clientY);
    if (delta > 0) {
      setIsDragging(true);
      e.preventDefault();
    } else {
      setIsDragging(false);
    }
  };

  const onTouchEnd = () => {
    if (touchStart && touchEnd && touchEnd - touchStart > 80) onOpenChange(false);
    setTouchStart(null);
    setTouchEnd(null);
    setIsDragging(false);
  };

  useBodyScrollLock(open);

  if (!open || !mounted) return null;

  const priceDisplay = price ? `${(price / 100).toFixed(0)} ${currency ?? ""}` : "Price on request";

  const content = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-[9998]"
        onClick={() => onOpenChange(false)}
        style={{ bottom: "calc(60px + env(safe-area-inset-bottom, 0px))" }}
      />

      {/* Sheet */}
      <div
        ref={modalRef}
        className="fixed left-1/2 bg-white rounded-t-3xl z-[9999] max-h-[90vh] overflow-y-auto w-full max-w-md"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          bottom: "calc(60px + env(safe-area-inset-bottom, 0px))",
          transform:
            open
              ? isDragging && touchStart && touchEnd
                ? `translate(-50%, ${Math.max(0, touchEnd - touchStart)}px)`
                : "translate(-50%, 0)"
              : "translate(-50%, 110%)",
          transition: isDragging ? "none" : "transform 0.3s ease-out",
          boxShadow: "0 -4px 24px rgba(0,0,0,0.15)",
          touchAction: "pan-y",
          overscrollBehavior: "contain",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1" data-drag-handle>
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {step > 1 && step < 5 && (
              <button
                onClick={() => setStep((s) => (s - 1) as typeof step)}
                className="p-1 -ml-1 text-gray-500"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h3 className="font-semibold text-base leading-tight">{masterName}</h3>
              {durationMinutes && (
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {durationMinutes} min · {priceDisplay}
                </p>
              )}
            </div>
          </div>
          <button onClick={() => onOpenChange(false)} className="p-1 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ─── STEP 1: Date ─── */}
        {step === 1 && (
          <BookingModalDateStep selectedDate={selectedDate} onSelectDate={handleDateSelect} />
        )}

        {/* ─── STEP 2: Time slots ─── */}
        {step === 2 && (
          <BookingModalTimeSlotStep
            selectedDate={selectedDate}
            timezone={timezone}
            slots={slots}
            loadingSlots={loadingSlots}
            onSelectSlot={handleSlotSelect}
            onPickAnotherDate={() => setStep(1)}
          />
        )}

        {/* ─── STEP 3: Notes ─── */}
        {step === 3 && (
          <BookingModalNotesStep
            notes={notes}
            onNotesChange={setNotes}
            previewing={previewing}
            onContinue={handleNotesNext}
            isGuest={isGuest}
            guestName={guestName}
            onGuestNameChange={setGuestName}
            guestPhone={guestPhone}
            onGuestPhoneChange={setGuestPhone}
          />
        )}

        {/* ─── STEP 4: Preview / Confirm ─── */}
        {step === 4 && preview && (
          <BookingModalConfirmStep
            preview={preview}
            masterName={masterName}
            timezone={timezone}
            notes={notes}
            submitting={submitting}
            onConfirm={handleConfirm}
          />
        )}

        {/* ─── STEP 5: Success ─── */}
        {step === 5 && (
          <BookingModalSuccessStep
            masterName={masterName}
            isGuest={isGuest}
            bookingId={bookingId}
            onViewBookings={() => {
              onOpenChange(false);
              router.push(`/${locale}/bookings`);
            }}
            onBackToFeed={() => onOpenChange(false)}
          />
        )}
      </div>
    </>
  );

  return createPortal(content, document.body);
}
