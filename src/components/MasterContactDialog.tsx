"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Phone, MessageCircle } from "lucide-react";


interface MasterContactDialogProps {
  open: boolean;
  onClose: () => void;
  master: {
    id: string;
    businessName: string;
    avatarUrl?: string | null;
    distance: number;
    price?: number | null;
    phoneNumber: string;
    phoneCountryCode: string;
  };
}

export default function MasterContactDialog({
  open,
  onClose,
  master,
}: MasterContactDialogProps) {
  const handleContact = (type: "call" | "sms") => {
    // Open native app
    const phone = `${master.phoneCountryCode}${master.phoneNumber}`;
    if (type === "call") {
      window.location.href = `tel:${phone}`;
    } else {
      window.location.href = `sms:${phone}?body=Hi, I saw your work on Nail Visual and I'm interested in booking an appointment.`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Contact Master</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Master Info */}
          <div className="flex items-center gap-3">
            <Avatar className="h-16 w-16">
              <AvatarImage src={master.avatarUrl || undefined} />
              <AvatarFallback>
                {master.businessName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">{master.businessName}</h3>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>{master.distance.toFixed(1)} km away</span>
              </div>
              {master.price && (
                <p className="text-sm text-muted-foreground">
                  From {master.price} PLN
                </p>
              )}
            </div>
          </div>

          {/* Contact Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => handleContact("sms")}
              variant="outline"
              className="w-full"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Text
            </Button>
            <Button
              onClick={() => handleContact("call")}
              className="w-full"
            >
              <Phone className="h-4 w-4 mr-2" />
              Call
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Your contact information will not be shared
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
