import { Button } from "konsta/react";
import { CheckCircle2 } from "lucide-react";

interface BookingModalSuccessStepProps {
  masterName: string;
  onViewBookings: () => void;
  onBackToFeed: () => void;
}

export default function BookingModalSuccessStep({
  masterName,
  onViewBookings,
  onBackToFeed,
}: BookingModalSuccessStepProps) {
  return (
    <div className="px-5 pb-8 pt-6 flex flex-col items-center text-center space-y-4">
      <CheckCircle2 className="w-16 h-16 text-green-500" />
      <div>
        <h4 className="text-xl font-bold">Booking sent!</h4>
        <p className="text-sm text-gray-500 mt-1">
          Waiting for {masterName} to confirm. You&apos;ll see it in your bookings.
        </p>
      </div>
      <Button large className="w-full" onClick={onViewBookings}>
        View My Bookings
      </Button>
      <button onClick={onBackToFeed} className="text-sm text-gray-400 underline">
        Back to feed
      </button>
    </div>
  );
}
