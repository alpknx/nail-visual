import { useEffect, useState } from "react";
import { startOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { format } from "date-fns";
import { useSession } from "next-auth/react";
import {
  getAvailableSlotsAction,
  previewBooking,
  createBooking,
  getMasterSchedule,
} from "@/app/actions";
import { toast } from "sonner";

export type BookingStep = 1 | 2 | 3 | 4 | 5;

interface UseBookingFlowParams {
  open: boolean;
  masterId: string;
  postId: string;
}

export function useBookingFlow({ open, masterId, postId }: UseBookingFlowParams) {
  const { data: session } = useSession();
  const isGuest = !session?.user;

  const [step, setStep] = useState<BookingStep>(1);
  const [timezone, setTimezone] = useState("Europe/Warsaw");

  // Step 1
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));

  // Step 2
  const [slots, setSlots] = useState<string[]>([]); // startUtc strings
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Step 3 - notes, plus guest contact info when not signed in as a client
  const [notes, setNotes] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  // Only a name is required for a guest booking - confirmation now happens
  // via Telegram, and phone is just an optional fallback for the master.
  const guestInfoComplete = !isGuest || Boolean(guestName);

  // Step 4
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof previewBooking>> | null>(null);
  const [previewing, setPreviewing] = useState(false);

  // Step 5
  const [submitting, setSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);

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
      setGuestName("");
      setGuestPhone("");
      setPreview(null);
      setBookingId(null);
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
    if (!guestInfoComplete) {
      toast.error("Please enter your name");
      return;
    }
    setPreviewing(true);
    try {
      const data = await previewBooking(masterId, postId, selectedSlot);
      setPreview(data);
      setStep(4);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Slot no longer available");
    } finally {
      setPreviewing(false);
    }
  };

  // Step 4 → 5: confirm
  const handleConfirm = async () => {
    if (!selectedSlot) return;
    setSubmitting(true);
    try {
      const booking = await createBooking({
        masterId,
        postId,
        datetimeUtc: selectedSlot,
        notes: notes || undefined,
        guest: isGuest
          ? { name: guestName, phone: guestPhone || undefined }
          : undefined,
      });
      setBookingId(booking.id);
      setStep(5);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Booking failed");
    } finally {
      setSubmitting(false);
    }
  };

  return {
    step,
    setStep,
    timezone,
    selectedDate,
    slots,
    loadingSlots,
    selectedSlot,
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
  };
}
