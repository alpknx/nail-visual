"use client";

import { useRef } from "react";
import { addDays, isSameDay } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

interface WeekPickerProps {
  selectedDate: Date;
  onSelect: (date: Date) => void;
  /** Master's schedule timezone - "today" and each day's label are computed
   * in this timezone, not the browser's, so they always agree with what
   * BookingAgenda actually queries for (see loadDay). */
  timezone: string;
  /** How many days to show ahead of today (default 60) */
  daysAhead?: number;
}

export default function WeekPicker({
  selectedDate,
  onSelect,
  timezone,
  daysAhead = 60,
}: WeekPickerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Compute "today" as a UTC-midnight Date representing the calendar date in
  // `timezone` right now - deliberately avoids startOfDay(new Date()), which
  // uses the browser's system-local timezone and can disagree with the
  // master's own schedule timezone by a day.
  const todayStr = formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
  const [ty, tm, td] = todayStr.split("-").map(Number);
  const today = new Date(Date.UTC(ty, tm - 1, td));

  const days = Array.from({ length: daysAhead }, (_, i) => addDays(today, i));

  return (
    <div
      ref={scrollRef}
      className="flex gap-2 overflow-x-auto px-4 py-3 no-scrollbar"
      style={{ scrollbarWidth: "none" }}
    >
      {days.map((day) => {
        const isSelected = isSameDay(day, selectedDate);
        return (
          <button
            key={day.toISOString()}
            onClick={() => onSelect(day)}
            className={[
              "flex flex-col items-center justify-center rounded-2xl min-w-[52px] h-[60px] text-xs font-medium transition-colors flex-shrink-0",
              isSelected
                ? "bg-black text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200",
            ].join(" ")}
          >
            <span className="text-[10px] uppercase tracking-wide opacity-70">
              {formatInTimeZone(day, "UTC", "EEE")}
            </span>
            <span className="text-base font-bold leading-none mt-0.5">
              {formatInTimeZone(day, "UTC", "d")}
            </span>
            <span className="text-[10px] opacity-60">{formatInTimeZone(day, "UTC", "MMM")}</span>
          </button>
        );
      })}
    </div>
  );
}
