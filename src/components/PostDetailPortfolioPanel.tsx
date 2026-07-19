import { Block, Button } from "konsta/react";
import { Clock, Edit, Trash2 } from "lucide-react";
import ContactButtons from "@/components/ContactButtons";

interface PostDetailPortfolioPanelProps {
  price: number | null;
  currency: string | null;
  durationMinutes: number | null;
  description: string | null;
  isOwner: boolean;
  isDeleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
  canBook: boolean;
  onBook: () => void;
  authorPhoneNumber: string;
  authorPhoneCountryCode: string | null;
}

export default function PostDetailPortfolioPanel({
  price,
  currency,
  durationMinutes,
  description,
  isOwner,
  isDeleting,
  onEdit,
  onDelete,
  canBook,
  onBook,
  authorPhoneNumber,
  authorPhoneCountryCode,
}: PostDetailPortfolioPanelProps) {
  return (
    <Block className="!my-0 !py-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-2xl font-bold text-gray-900 whitespace-nowrap">
            {price ? `${price} ${currency}` : 'Price on request'}
          </div>
          {durationMinutes && (
            <div className="flex items-center text-base text-gray-600 whitespace-nowrap">
              <Clock className="w-4 h-4 mr-1.5" />
              <span>{durationMinutes} mins</span>
            </div>
          )}
        </div>
        {isOwner && (
          <Button
            clear
            className="!p-2"
            onClick={(e) => {
              e.preventDefault();
              onEdit();
            }}
          >
            <Edit className="w-5 h-5" />
          </Button>
        )}
      </div>

      {description && (
        <div className="text-sm text-gray-700">
          {description}
        </div>
      )}

      {isOwner ? (
        <div className="flex gap-2">
          <Button
            large
            className="flex-1"
            onClick={onEdit}
            disabled={isDeleting}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Post
          </Button>
          <Button
            large
            className="flex-1 bg-red-500 active:bg-red-600"
            onClick={onDelete}
            disabled={isDeleting}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {canBook && (
            <Button large className="w-full" onClick={onBook}>
              Book Appointment
            </Button>
          )}
          <ContactButtons
            phoneNumber={authorPhoneNumber}
            phoneCountryCode={authorPhoneCountryCode}
          />
        </div>
      )}
    </Block>
  );
}
