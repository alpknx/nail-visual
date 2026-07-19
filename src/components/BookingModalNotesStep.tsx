import { Button } from "konsta/react";

interface BookingModalNotesStepProps {
  notes: string;
  onNotesChange: (notes: string) => void;
  previewing: boolean;
  onContinue: () => void;
}

export default function BookingModalNotesStep({
  notes,
  onNotesChange,
  previewing,
  onContinue,
}: BookingModalNotesStepProps) {
  return (
    <div className="px-5 pb-8 pt-4 space-y-4">
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
