"use client";

import Image from "next/image";
import { MapPin, DollarSign } from "lucide-react";
import { Card } from "konsta/react";

interface Match {
  masterId: string;
  businessName: string;
  phoneNumber: string;
  phoneCountryCode: string | null;
  avatarUrl?: string | null;
  score: number;
  distance: number;
  matchingImageUrl: string | null;
  price: number | null;
}

interface MatchingMastersListProps {
  matches: Match[];
  onMatchClick: (match: Match) => void;
}

export default function MatchingMastersList({ matches, onMatchClick }: MatchingMastersListProps) {
  if (matches.length === 0) {
    return (
      <div className="flex gap-3">
        <p className="text-sm text-muted-foreground py-4">
          No matching masters found nearby.
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-3 min-h-24">
      {matches.map((match) => (
        <div key={match.masterId} className="flex-shrink-0 w-48">
          <Card
            outline
            className="!m-0 h-full active:scale-95 transition-transform cursor-pointer select-none"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onMatchClick(match);
            }}
            style={{
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            <div className="relative h-32 -mx-4 -mt-4 mb-2 bg-gray-100">
              {match.matchingImageUrl && (
                <Image
                  src={match.matchingImageUrl}
                  alt={match.businessName}
                  fill
                  sizes="192px"
                  className="object-cover"
                />
              )}
            </div>
            <h3 className="font-medium text-sm truncate">
              {match.businessName}
            </h3>
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
              <MapPin className="h-3 w-3" />
              <span>{match.distance.toFixed(1)} km</span>
            </div>
            {match.price && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <DollarSign className="h-3 w-3" />
                <span>{match.price} PLN</span>
              </div>
            )}
            <div className="mt-2 text-xs bg-primary/10 text-primary px-2 py-1 rounded-md inline-block">
              Match Score: {match.score}
            </div>
          </Card>
        </div>
      ))}
    </div>
  );
}
