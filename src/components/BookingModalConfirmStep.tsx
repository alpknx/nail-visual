import { Button } from "konsta/react";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { previewBooking } from "@/app/actions";

type BookingPreview = Awaited<ReturnType<typeof previewBooking>>;

interface BookingModalConfirmStepProps {
  preview: BookingPreview;
  masterName: string;
  timezone: string;
  notes: string;
  submitting: boolean;
  onConfirm: () => void;
}

export default function BookingModalConfirmStep({
  preview,
  masterName,
  timezone,
  notes,
  submitting,
  onConfirm,
}: BookingModalConfirmStepProps) {
  return (
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

      <Button large onClick={onConfirm} disabled={submitting}>
        {submitting ? "Booking..." : "Confirm Booking"}
      </Button>
    </div>
  );
}
