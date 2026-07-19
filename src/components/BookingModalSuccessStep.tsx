import { Button } from "konsta/react";
import { CheckCircle2, Send } from "lucide-react";

interface BookingModalSuccessStepProps {
  masterName: string;
  isGuest: boolean;
  bookingId: string | null;
  onViewBookings: () => void;
  onBackToFeed: () => void;
}

const TELEGRAM_BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

export default function BookingModalSuccessStep({
  masterName,
  isGuest,
  bookingId,
  onViewBookings,
  onBackToFeed,
}: BookingModalSuccessStepProps) {
  const telegramLink =
    isGuest && bookingId && TELEGRAM_BOT_USERNAME
      ? `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${bookingId}`
      : null;

  return (
    <div className="px-5 pb-8 pt-6 flex flex-col items-center text-center space-y-4">
      <CheckCircle2 className="w-16 h-16 text-green-500" />
      <div>
        <h4 className="text-xl font-bold">Booking sent!</h4>
        <p className="text-sm text-gray-500 mt-1">
          {isGuest
            ? telegramLink
              ? `One last step - confirm via Telegram so ${masterName} knows you're coming.`
              : `Waiting for ${masterName} to confirm.`
            : `Waiting for ${masterName} to confirm. You'll see it in your bookings.`}
        </p>
      </div>
      {telegramLink && (
        <a href={telegramLink} target="_blank" rel="noopener noreferrer" className="w-full">
          <Button large className="w-full bg-[#229ED9]">
            <Send className="w-4 h-4 mr-2" />
            Confirm via Telegram
          </Button>
        </a>
      )}
      {isGuest ? (
        <button onClick={onBackToFeed} className="text-sm text-gray-400 underline">
          Back to feed
        </button>
      ) : (
        <>
          <Button large className="w-full" onClick={onViewBookings}>
            View My Bookings
          </Button>
          <button onClick={onBackToFeed} className="text-sm text-gray-400 underline">
            Back to feed
          </button>
        </>
      )}
    </div>
  );
}
