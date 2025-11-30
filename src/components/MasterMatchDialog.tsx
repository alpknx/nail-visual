"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Phone, MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { trackConversionClick } from "@/app/actions";

interface MasterMatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  master: {
    masterId: string;
    businessName: string;
    avatarUrl?: string | null;
    distance: number;
    price?: number | null;
    phoneNumber: string;
    phoneCountryCode: string | null;
    matchingImageUrl: string | null;
  };
}

export default function MasterMatchDialog({
  open,
  onOpenChange,
  master,
}: MasterMatchDialogProps) {
  const handleContact = async (type: "call" | "sms") => {
    // Track conversion
    await trackConversionClick(master.masterId, type);

    // Prepare phone number
    const cleanNumber = master.phoneNumber.replace(/[^\d+]/g, "");
    // Note: In a real app we might want to combine country code if not present in phoneNumber
    // But schema says phoneNumber is varchar(50) and phoneCountryCode is separate.
    // Let's assume phoneNumber might not have the country code or we construct it.
    // For now, let's just use the cleaned phoneNumber as is, or prepend country code if needed.
    // The previous dialog implementation did `${master.phoneCountryCode}${master.phoneNumber}`.
    // Let's stick to that pattern if possible, but we need to be careful about double +

    const fullPhone = `${master.phoneCountryCode}${master.phoneNumber}`.replace(/\+\+/g, "+");

    if (type === "call") {
      window.location.href = `tel:${fullPhone}`;
    } else {
      const appName = "Nail Visual";
      const body = `Hi ${master.businessName}, I saw your work on ${appName} and would like to book an appointment.`;
      const encodedBody = encodeURIComponent(body);

      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const delimiter = isIOS ? "&" : "?";

      window.location.href = `sms:${fullPhone}${delimiter}body=${encodedBody}`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTitle></DialogTitle>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0">

        {/* Header - Clickable to Profile */}
        <div className="p-4 bg-white border-b border-gray-100">
          <Link href={`/master/${master.masterId}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Avatar className="h-12 w-12 border border-gray-100">
              <AvatarImage src={master.avatarUrl || undefined} />
              <AvatarFallback>
                {master.businessName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-lg leading-tight">{master.businessName}</h3>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>{master.distance.toFixed(1)} km away</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Matched Image */}
        <div className="relative aspect-[4/5] w-full bg-gray-100">
          {master.matchingImageUrl ? (
            <Image
              src={master.matchingImageUrl}
              alt={`Work by ${master.businessName}`}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No image available
            </div>
          )}

          {/* Price Tag Overlay */}
          {master.price && (
            <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-sm font-medium">
              {master.price} PLN
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 grid grid-cols-2 gap-3 bg-white border-t border-gray-100">
          <Button
            onClick={() => handleContact("sms")}
            className="w-full bg-black text-white hover:bg-black/90"
            size="lg"
          >
            <MessageCircle className="h-5 w-5 mr-2" />
            Text
          </Button>
          <Button
            onClick={() => handleContact("call")}
            variant="outline"
            className="w-full border-gray-200 hover:bg-gray-50"
            size="lg"
          >
            <Phone className="h-5 w-5 mr-2" />
            Call
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
