import { Block } from "konsta/react";
import MatchingMastersList from "@/components/MatchingMastersList";

interface Match {
  masterId: string;
  businessName: string;
  phoneNumber: string;
  phoneCountryCode: string | null;
  avatarUrl?: string | null;
  score: number;
  matchingImageUrl: string | null;
  matchingPostId: string | null;
  price: number | null;
  currency: string | null;
  durationMinutes: number | null;
}

interface PostDetailSimilarWorksProps {
  matchingMasters: Match[];
  finalIsPortfolioMode: boolean;
  isPortfolioMode: boolean;
  onMatchClick: (match: Match) => void;
}

export default function PostDetailSimilarWorks({
  matchingMasters,
  finalIsPortfolioMode,
  isPortfolioMode,
  onMatchClick,
}: PostDetailSimilarWorksProps) {
  // Only show "Similar Works Nearby" if NOT in portfolio mode AND we have matching masters
  const shouldShow = !finalIsPortfolioMode && !isPortfolioMode && matchingMasters && matchingMasters.length > 0;

  if (!shouldShow) return null;

  return (
    <>
      <Block className="!my-0 !py-2">
        <h2 className="text-sm font-semibold text-gray-900">Similar Works Nearby</h2>
      </Block>

      {/* Horizontal Scroll for Matching Masters */}
      <div className="overflow-x-auto px-4 no-scrollbar flex gap-3">
        <MatchingMastersList matches={matchingMasters} onMatchClick={onMatchClick} />
      </div>
    </>
  );
}
