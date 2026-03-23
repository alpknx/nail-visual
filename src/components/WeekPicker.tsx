"use client";

import { useRef } from "react";
import { format, addDays, startOfDay, isSameDay } from "date-fns";

interface WeekPickerProps {
  selectedDate: Date;
  onSelect: (date: Date) => void;
  /** How many days to show ahead of today (default 60) */
  daysAhead?: number;
}

export default function WeekPicker({
  selectedDate,
  onSelect,
  daysAhead = 60,
}: WeekPickerProps) {
  const today = startOfDay(new Date());
  const scrollRef = useRef<HTMLDivElement>(null);

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
              {format(day, "EEE")}
            </span>
            <span className="text-base font-bold leading-none mt-0.5">
              {format(day, "d")}
            </span>
            <span className="text-[10px] opacity-60">{format(day, "MMM")}</span>
          </button>
        );
      })}
    </div>
  );
}
