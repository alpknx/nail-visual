"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "konsta/react";
import { X, ChevronLeft, CheckCircle2, Clock, CalendarDays } from "lucide-react";
import { format, addDays, startOfDay, isSameDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { useParams, useRouter } from "next/navigation";
import {
  getAvailableSlotsAction,
  previewBooking,
  createBooking,
  getMasterSchedule,
} from "@/app/actions";
import { toast } from "sonner";

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

type Step = 1 | 2 | 3 | 4 | 5;

const DAYS_AHEAD = 30;

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
  const [step, setStep] = useState<Step>(1);
  const [timezone, setTimezone] = useState("Europe/Warsaw");

  // Step 1
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));

  // Step 2
  const [slots, setSlots] = useState<string[]>([]); // startUtc strings
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Step 3
  const [notes, setNotes] = useState("");

  // Step 4
  const [preview, setPreview] = useState<any>(null);
  const [previewing, setPreviewing] = useState(false);

  // Step 5
  const [submitting, setSubmitting] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load master timezone on open
  useEffect(() => {
    if (!open) return;
    getMasterSchedule(masterId).then((s) => {
      if (s?.timezone) setTimezone(s.timezone);
    });
  }, [open, masterId]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep(1);
      setSelectedDate(startOfDay(new Date()));
      setSlots([]);
      setSelectedSlot(null);
      setNotes("");
      setPreview(null);
    }
  }, [open]);

  // Load slots when date selected (step 1 → 2)
  const handleDateSelect = async (date: Date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setSlots([]);
    setLoadingSlots(true);
    setStep(2);

    const localDate = toZonedTime(date, timezone);
    const dateStr = format(localDate, "yyyy-MM-dd");

    try {
      const result = await getAvailableSlotsAction(masterId, postId, dateStr);
      setSlots(result.map((s) => s.startUtc));
    } catch {
      toast.error("Failed to load slots");
    } finally {
      setLoadingSlots(false);
    }
  };

  // Step 2 → 3
  const handleSlotSelect = (slotUtc: string) => {
    setSelectedSlot(slotUtc);
    setStep(3);
  };

  // Step 3 → 4: preview
  const handleNotesNext = async () => {
    if (!selectedSlot) return;
    setPreviewing(true);
    try {
      const data = await previewBooking(masterId, postId, selectedSlot);
      setPreview(data);
      setStep(4);
    } catch (e: any) {
      toast.error(e.message ?? "Slot no longer available");
    } finally {
      setPreviewing(false);
    }
  };

  // Step 4 → 5: confirm
  const handleConfirm = async () => {
    if (!selectedSlot) return;
    setSubmitting(true);
    try {
      await createBooking({
        masterId,
        postId,
        datetimeUtc: selectedSlot,
        notes: notes || undefined,
      });
      setStep(5);
    } catch (e: any) {
      toast.error(e.message ?? "Booking failed");
    } finally {
      setSubmitting(false);
    }
  };

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

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open || !mounted) return null;

  const today = startOfDay(new Date());
  const days = Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(today, i));

  const formatSlot = (utc: string) => {
    const local = toZonedTime(new Date(utc), timezone);
    return format(local, "HH:mm");
  };

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
                onClick={() => setStep((s) => (s - 1) as Step)}
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
          <div className="pb-8">
            <p className="px-5 pt-4 pb-2 text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Choose a date
            </p>
            <div className="flex gap-2 overflow-x-auto px-4 pb-2 no-scrollbar">
              {days.map((day) => {
                const isSelected = isSameDay(day, selectedDate);
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => handleDateSelect(day)}
                    className={[
                      "flex flex-col items-center justify-center rounded-2xl min-w-[52px] h-[64px] text-xs font-medium flex-shrink-0 transition-colors",
                      isSelected ? "bg-black text-white" : "bg-gray-100 text-gray-700",
                    ].join(" ")}
                  >
                    <span className="text-[10px] uppercase tracking-wide opacity-70">
                      {format(day, "EEE")}
                    </span>
                    <span className="text-lg font-bold leading-none mt-0.5">
                      {format(day, "d")}
                    </span>
                    <span className="text-[10px] opacity-60">{format(day, "MMM")}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── STEP 2: Time slots ─── */}
        {step === 2 && (
          <div className="pb-8">
            <p className="px-5 pt-4 pb-2 text-sm font-semibold text-gray-500 uppercase tracking-wide">
              {format(selectedDate, "EEEE, MMMM d")} · Choose a time
            </p>
            {loadingSlots ? (
              <p className="px-5 py-6 text-sm text-gray-400 text-center">Loading slots…</p>
            ) : slots.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <CalendarDays className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No available slots for this day.</p>
                <button
                  onClick={() => setStep(1)}
                  className="mt-3 text-sm text-black underline"
                >
                  Pick another date
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 px-5 pt-1">
                {slots.map((slotUtc) => (
                  <button
                    key={slotUtc}
                    onClick={() => handleSlotSelect(slotUtc)}
                    className="px-4 py-2 rounded-full bg-gray-100 text-sm font-medium hover:bg-black hover:text-white transition-colors"
                  >
                    {formatSlot(slotUtc)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── STEP 3: Notes ─── */}
        {step === 3 && (
          <div className="px-5 pb-8 pt-4 space-y-4">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Any notes for the master?
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. I prefer gel base, allergic to acryl..."
              rows={4}
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm resize-none outline-none focus:border-black"
            />
            <Button large onClick={handleNotesNext} disabled={previewing}>
              {previewing ? "Checking..." : "Continue"}
            </Button>
          </div>
        )}

        {/* ─── STEP 4: Preview / Confirm ─── */}
        {step === 4 && preview && (
          <div className="px-5 pb-8 pt-4 space-y-4">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Confirm your booking
            </p>

            <div className="rounded-2xl border border-gray-100 divide-y divide-gray-100">
              <div className="flex justify-between items-center px-4 py-3">
                <span className="text-sm text-gray-500">Master</span>
                <span className="text-sm font-medium">{masterName}</span>
              </div>
              <div className="flex justify-between items-center px-4 py-3">
                <span className="text-sm text-gray-500">Date</span>
                <span className="text-sm font-medium">
                  {format(toZonedTime(new Date(preview.startUtc), timezone), "MMM d, yyyy")}
                </span>
              </div>
              <div className="flex justify-between items-center px-4 py-3">
                <span className="text-sm text-gray-500">Time</span>
                <span className="text-sm font-medium">
                  {format(toZonedTime(new Date(preview.startUtc), timezone), "HH:mm")}
                  {" – "}
                  {format(toZonedTime(new Date(preview.endUtc), timezone), "HH:mm")}
                </span>
              </div>
              {preview.post.durationMinutes && (
                <div className="flex justify-between items-center px-4 py-3">
                  <span className="text-sm text-gray-500">Duration</span>
                  <span className="text-sm font-medium">{preview.post.durationMinutes} min</span>
                </div>
              )}
              {preview.post.price && (
                <div className="flex justify-between items-center px-4 py-3">
                  <span className="text-sm text-gray-500">Price</span>
                  <span className="text-sm font-medium">
                    {(preview.post.price / 100).toFixed(2)} {preview.post.currency ?? ""}
                  </span>
                </div>
              )}
              {notes && (
                <div className="flex justify-between items-start px-4 py-3 gap-4">
                  <span className="text-sm text-gray-500 flex-shrink-0">Notes</span>
                  <span className="text-sm text-right">{notes}</span>
                </div>
              )}
            </div>

            <Button large onClick={handleConfirm} disabled={submitting}>
              {submitting ? "Booking..." : "Confirm Booking"}
            </Button>
          </div>
        )}

        {/* ─── STEP 5: Success ─── */}
        {step === 5 && (
          <div className="px-5 pb-8 pt-6 flex flex-col items-center text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 text-green-500" />
            <div>
              <h4 className="text-xl font-bold">Booking sent!</h4>
              <p className="text-sm text-gray-500 mt-1">
                Waiting for {masterName} to confirm. You'll see it in your bookings.
              </p>
            </div>
            <Button
              large
              className="w-full"
              onClick={() => {
                onOpenChange(false);
                router.push(`/${locale}/bookings`);
              }}
            >
              View My Bookings
            </Button>
            <button onClick={() => onOpenChange(false)} className="text-sm text-gray-400 underline">
              Back to feed
            </button>
          </div>
        )}
      </div>
    </>
  );

  return createPortal(content, document.body);
}
