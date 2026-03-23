"use client";

import { useState, useEffect, useCallback } from "react";
import { Page, Navbar, NavbarBackLink, Block, Button } from "konsta/react";
import { useRouter, useParams } from "next/navigation";
import { format, startOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { getMasterCalendarData, confirmBooking, cancelBookingByMaster } from "@/app/actions";
import WeekPicker from "@/components/WeekPicker";
import { toast } from "sonner";

type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

interface Booking {
  id: string;
  status: BookingStatus;
  startDatetimeUtc: Date;
  endDatetimeUtc: Date;
  notes: string | null;
  post: {
    description: string | null;
    price: number | null;
    currency: string | null;
    durationMinutes: number | null;
  };
  client: {
    name: string | null;
    email: string | null;
  };
}

interface Override {
  id: string;
  startDatetimeUtc: Date;
  endDatetimeUtc: Date;
  notes: string | null;
}

const STATUS_STYLES: Record<BookingStatus, { bar: string; badge: string; label: string }> = {
  pending:   { bar: "bg-yellow-400", badge: "bg-yellow-100 text-yellow-800", label: "Pending" },
  confirmed: { bar: "bg-green-500",  badge: "bg-green-100 text-green-800",   label: "Confirmed" },
  cancelled: { bar: "bg-gray-300",   badge: "bg-gray-100 text-gray-500",     label: "Cancelled" },
  completed: { bar: "bg-blue-400",   badge: "bg-blue-100 text-blue-800",     label: "Completed" },
};

export default function BookingAgenda({ masterId, timezone }: { masterId: string; timezone: string }) {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || "en";

  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDay = useCallback(async (date: Date) => {
    setLoading(true);
    try {
      // Format date as "YYYY-MM-DD" in master's timezone
      const localDate = toZonedTime(date, timezone);
      const dateStr = format(localDate, "yyyy-MM-dd");
      const data = await getMasterCalendarData(dateStr);
      setBookings(data.bookings as Booking[]);
      setOverrides(data.overrides as Override[]);
    } catch {
      toast.error("Failed to load calendar");
    } finally {
      setLoading(false);
    }
  }, [timezone]);

  useEffect(() => {
    loadDay(selectedDate);
  }, [selectedDate, loadDay]);

  const formatTime = (utcDate: Date) => {
    const local = toZonedTime(new Date(utcDate), timezone);
    return format(local, "HH:mm");
  };

  const handleConfirm = async (id: string) => {
    try {
      await confirmBooking(id);
      toast.success("Booking confirmed");
      await loadDay(selectedDate);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to confirm");
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelBookingByMaster(id);
      toast.success("Booking cancelled");
      await loadDay(selectedDate);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to cancel");
    }
  };

  const isEmpty = !loading && bookings.length === 0 && overrides.length === 0;

  return (
    <Page>
      <Navbar
        title="Booking Calendar"
        left={<NavbarBackLink onClick={() => router.back()} text="Back" />}
      />

      <WeekPicker selectedDate={selectedDate} onSelect={setSelectedDate} />

      <div className="px-4 pb-2">
        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          {format(selectedDate, "EEEE, MMMM d")}
        </p>
      </div>

      {loading && (
        <Block className="text-center text-gray-400 text-sm">Loading...</Block>
      )}

      {isEmpty && (
        <Block className="text-center text-gray-400 text-sm">
          No bookings for this day.
        </Block>
      )}

      {/* Overrides */}
      {overrides.length > 0 && (
        <div className="px-4 space-y-2 mb-2">
          {overrides.map((o) => (
            <div
              key={o.id}
              className="flex items-center gap-3 rounded-2xl bg-gray-100 px-4 py-3"
            >
              <div className="w-1 self-stretch rounded-full bg-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">
                  {formatTime(o.startDatetimeUtc)} – {formatTime(o.endDatetimeUtc)}
                </p>
                <p className="text-sm font-medium text-gray-600 truncate">
                  🚫 {o.notes ?? "Blocked"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bookings */}
      <div className="px-4 space-y-3 pb-24">
        {bookings.map((b) => {
          const s = STATUS_STYLES[b.status];
          return (
            <div
              key={b.id}
              className="flex gap-3 rounded-2xl bg-white shadow-sm border border-gray-100 px-4 py-3"
            >
              {/* Status bar */}
              <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${s.bar}`} />

              <div className="flex-1 min-w-0">
                {/* Time */}
                <p className="text-xs text-gray-400 mb-0.5">
                  {formatTime(b.startDatetimeUtc)} – {formatTime(b.endDatetimeUtc)}
                  {b.post.durationMinutes && (
                    <span className="ml-1 opacity-60">({b.post.durationMinutes} min)</span>
                  )}
                </p>

                {/* Client */}
                <p className="text-sm font-semibold truncate">
                  {b.client.name ?? b.client.email ?? "Client"}
                </p>

                {/* Service */}
                {b.post.description && (
                  <p className="text-xs text-gray-500 truncate mt-0.5">{b.post.description}</p>
                )}

                {/* Price */}
                {b.post.price != null && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {(b.post.price / 100).toFixed(2)} {b.post.currency ?? ""}
                  </p>
                )}

                {/* Notes */}
                {b.notes && (
                  <p className="text-xs italic text-gray-400 mt-1 truncate">"{b.notes}"</p>
                )}

                {/* Status badge + actions */}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${s.badge}`}>
                    {s.label}
                  </span>

                  {b.status === "pending" && (
                    <button
                      onClick={() => handleConfirm(b.id)}
                      className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-600 text-white"
                    >
                      Confirm
                    </button>
                  )}

                  {(b.status === "pending" || b.status === "confirmed") && (
                    <button
                      onClick={() => handleCancel(b.id)}
                      className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-600"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Page>
  );
}
