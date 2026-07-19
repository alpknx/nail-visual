import { format, addDays, startOfDay, isSameDay } from "date-fns";

const DAYS_AHEAD = 30;

interface BookingModalDateStepProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

export default function BookingModalDateStep({
  selectedDate,
  onSelectDate,
}: BookingModalDateStepProps) {
  const today = startOfDay(new Date());
  const days = Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(today, i));

  return (
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
              onClick={() => onSelectDate(day)}
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
  );
}
