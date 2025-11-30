"use client";

import { useState } from "react";
import Image from "next/image";
import { MapPin, DollarSign } from "lucide-react";
import MasterMatchDialog from "@/components/MasterMatchDialog";

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
}

export default function MatchingMastersList({ matches }: MatchingMastersListProps) {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  if (matches.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No matching masters found nearby.
      </p>
    );
  }

  return (
    <>
      <div className="flex gap-3">
        {matches.map((match) => (
          <button
            key={match.masterId}
            onClick={() => setSelectedMatch(match)}
            className="flex-shrink-0 w-48 rounded-lg border bg-card p-3 hover:bg-muted/50 transition-colors text-left"
          >
            <div className="relative h-32 rounded-md overflow-hidden mb-2 bg-muted">
              {match.matchingImageUrl && (
                <Image
                  src={match.matchingImageUrl}
                  alt={match.businessName}
                  fill
                  className="object-cover"
                />
              )}
            </div>
            <h3 className="font-medium text-sm truncate">
              {match.businessName}
            </h3>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <MapPin className="h-3 w-3" />
              <span>{match.distance.toFixed(1)} km</span>
            </div>
            {match.price && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <DollarSign className="h-3 w-3" />
                <span>{match.price} PLN</span>
              </div>
            )}
            <div className="mt-2 text-xs bg-primary/10 text-primary px-2 py-1 rounded-md inline-block">
              Match Score: {match.score}
            </div>
          </button>
        ))}
      </div>

      {selectedMatch && (
        <MasterMatchDialog
          open={!!selectedMatch}
          onOpenChange={(open) => !open && setSelectedMatch(null)}
          master={selectedMatch}
        />
      )}
    </>
  );
}
