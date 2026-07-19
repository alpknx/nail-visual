import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { CalendarDays } from "lucide-react";

interface BookingModalTimeSlotStepProps {
  selectedDate: Date;
  timezone: string;
  slots: string[];
  loadingSlots: boolean;
  onSelectSlot: (slotUtc: string) => void;
  onPickAnotherDate: () => void;
}

export default function BookingModalTimeSlotStep({
  selectedDate,
  timezone,
  slots,
  loadingSlots,
  onSelectSlot,
  onPickAnotherDate,
}: BookingModalTimeSlotStepProps) {
  const formatSlot = (utc: string) => {
    const local = toZonedTime(new Date(utc), timezone);
    return format(local, "HH:mm");
  };

  return (
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
          <button onClick={onPickAnotherDate} className="mt-3 text-sm text-black underline">
            Pick another date
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 px-5 pt-1">
          {slots.map((slotUtc) => (
            <button
              key={slotUtc}
              onClick={() => onSelectSlot(slotUtc)}
              className="px-4 py-2 rounded-full bg-gray-100 text-sm font-medium hover:bg-black hover:text-white transition-colors"
            >
              {formatSlot(slotUtc)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
