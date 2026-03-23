"use client";

import { useState, useEffect, useCallback } from "react";
import { Page, Navbar, Block } from "konsta/react";
import { useRouter, useParams } from "next/navigation";
import { format, isFuture } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import Image from "next/image";
import { cancelBooking, getClientBookings } from "@/app/actions";
import { toast } from "sonner";
import { CalendarDays } from "lucide-react";

type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

interface Booking {
  id: string;
  status: BookingStatus;
  startDatetimeUtc: Date;
  endDatetimeUtc: Date;
  notes: string | null;
  post: {
    imageUrl: string;
    description: string | null;
    price: number | null;
    currency: string | null;
    durationMinutes: number | null;
    author: {
      businessName: string;
      avatarUrl: string | null;
      timezone?: string | null;
    };
  };
}

const STATUS_STYLES: Record<BookingStatus, { badge: string; label: string }> = {
  pending:   { badge: "bg-yellow-100 text-yellow-800", label: "Pending" },
  confirmed: { badge: "bg-green-100 text-green-800",   label: "Confirmed" },
  cancelled: { badge: "bg-gray-100 text-gray-500",     label: "Cancelled" },
  completed: { badge: "bg-blue-100 text-blue-800",     label: "Completed" },
};

function BookingCard({
  booking,
  onCancel,
}: {
  booking: Booking;
  onCancel: (id: string) => Promise<void>;
}) {
  const [cancelling, setCancelling] = useState(false);
  const s = STATUS_STYLES[booking.status];
  const canCancel = booking.status === "pending" || booking.status === "confirmed";
  const isUpcoming = isFuture(new Date(booking.startDatetimeUtc));

  const startLocal = toZonedTime(new Date(booking.startDatetimeUtc), "UTC");

  const handleCancel = async () => {
    if (!confirm("Cancel this booking?")) return;
    setCancelling(true);
    try {
      await onCancel(booking.id);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Image strip */}
      <div className="relative h-32 bg-gray-100">
        <Image
          src={booking.post.imageUrl}
          alt={booking.post.description ?? "Nail art"}
          fill
          className="object-cover"
          sizes="(max-width: 480px) 100vw, 480px"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        {/* Status badge */}
        <span
          className={`absolute top-2 right-2 text-[11px] font-semibold px-2 py-0.5 rounded-full ${s.badge}`}
        >
          {s.label}
        </span>
      </div>

      <div className="px-4 py-3 space-y-1">
        {/* Master */}
        <p className="font-semibold text-sm">{booking.post.author.businessName}</p>

        {/* Date & time */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <CalendarDays className="w-3.5 h-3.5" />
          <span>{format(startLocal, "MMMM d, yyyy · HH:mm")}</span>
          {booking.post.durationMinutes && (
            <span className="opacity-60">({booking.post.durationMinutes} min)</span>
          )}
        </div>

        {/* Price */}
        {booking.post.price != null && (
          <p className="text-xs text-gray-400">
            {(booking.post.price / 100).toFixed(2)} {booking.post.currency ?? ""}
          </p>
        )}

        {/* Notes */}
        {booking.notes && (
          <p className="text-xs italic text-gray-400">"{booking.notes}"</p>
        )}

        {/* Cancel button */}
        {canCancel && isUpcoming && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="mt-2 w-full rounded-xl py-2 text-sm font-medium text-red-500 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {cancelling ? "Cancelling..." : "Cancel booking"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function BookingsList() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || "en";

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  const load = useCallback(async () => {
    try {
      const data = await getClientBookings();
      setBookings(data as Booking[]);
    } catch {
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCancel = async (id: string) => {
    try {
      await cancelBooking(id);
      toast.success("Booking cancelled");
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to cancel");
    }
  };

  const now = new Date();
  const upcoming = bookings.filter(
    (b) => b.status !== "cancelled" && isFuture(new Date(b.startDatetimeUtc))
  );
  const past = bookings.filter(
    (b) => b.status === "cancelled" || !isFuture(new Date(b.startDatetimeUtc))
  );
  const shown = tab === "upcoming" ? upcoming : past;

  return (
    <Page>
      <Navbar title="My Bookings" />

      {/* Tabs */}
      <div className="flex gap-1 mx-4 mt-2 mb-4 p-1 bg-gray-100 rounded-2xl">
        {(["upcoming", "past"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              "flex-1 py-2 text-sm font-medium rounded-xl transition-colors capitalize",
              tab === t ? "bg-white shadow-sm text-black" : "text-gray-500",
            ].join(" ")}
          >
            {t === "upcoming" ? `Upcoming (${upcoming.length})` : `Past (${past.length})`}
          </button>
        ))}
      </div>

      {loading && (
        <Block className="text-center text-gray-400 text-sm">Loading...</Block>
      )}

      {!loading && shown.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <CalendarDays className="w-12 h-12 text-gray-200 mb-3" />
          <p className="text-gray-400 text-sm">
            {tab === "upcoming"
              ? "No upcoming bookings. Find a master and book!"
              : "No past bookings yet."}
          </p>
          {tab === "upcoming" && (
            <button
              onClick={() => router.push(`/${locale}`)}
              className="mt-4 text-sm font-medium text-black underline"
            >
              Explore masters
            </button>
          )}
        </div>
      )}

      <div className="px-4 pb-24 space-y-3">
        {shown.map((b) => (
          <BookingCard key={b.id} booking={b} onCancel={handleCancel} />
        ))}
      </div>
    </Page>
  );
}
