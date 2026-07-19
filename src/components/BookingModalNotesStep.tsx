import { Button } from "konsta/react";

interface BookingModalNotesStepProps {
  notes: string;
  onNotesChange: (notes: string) => void;
  previewing: boolean;
  onContinue: () => void;
  isGuest: boolean;
  guestName: string;
  onGuestNameChange: (value: string) => void;
  guestEmail: string;
  onGuestEmailChange: (value: string) => void;
  guestPhone: string;
  onGuestPhoneChange: (value: string) => void;
}

export default function BookingModalNotesStep({
  notes,
  onNotesChange,
  previewing,
  onContinue,
  isGuest,
  guestName,
  onGuestNameChange,
  guestEmail,
  onGuestEmailChange,
  guestPhone,
  onGuestPhoneChange,
}: BookingModalNotesStepProps) {
  return (
    <div className="px-5 pb-8 pt-4 space-y-4">
      {isGuest && (
        <>
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Your contact info
          </p>
          <p className="text-xs text-gray-400 -mt-2">
            No account needed - you&apos;ll get a confirmation by email, and the
            master will contact you by phone.
          </p>
          <input
            type="text"
            value={guestName}
            onChange={(e) => onGuestNameChange(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black"
          />
          <input
            type="email"
            value={guestEmail}
            onChange={(e) => onGuestEmailChange(e.target.value)}
            placeholder="your@email.com"
            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black"
          />
          <input
            type="tel"
            value={guestPhone}
            onChange={(e) => onGuestPhoneChange(e.target.value)}
            placeholder="Phone number"
            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black"
          />
        </>
      )}
      <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
        Any notes for the master?
      </p>
      <textarea
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        placeholder="e.g. I prefer gel base, allergic to acryl..."
        rows={4}
        className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm resize-none outline-none focus:border-black"
      />
      <Button large onClick={onContinue} disabled={previewing}>
        {previewing ? "Checking..." : "Continue"}
      </Button>
    </div>
  );
}
