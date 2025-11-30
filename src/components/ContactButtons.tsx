"use client";

import React from "react";
import { Button } from "konsta/react";
import { MessageCircle, Phone } from "lucide-react";

interface ContactButtonsProps {
  phoneNumber: string;
  phoneCountryCode?: string | null;
}

export default function ContactButtons({
  phoneNumber,
  phoneCountryCode,
}: ContactButtonsProps) {

  const handleContact = async (type: "call" | "sms") => {
    if (!phoneNumber) return;

    // Prepare phone number
    // Combine country code if present and not already in phone number
    // This logic mimics MasterMatchDialog's logic
    let fullPhone = phoneNumber;
    if (phoneCountryCode && !phoneNumber.startsWith(phoneCountryCode)) {
      fullPhone = `${phoneCountryCode}${phoneNumber}`;
    }
    // Clean for tel link
    const cleanNumber = fullPhone.replace(/[^\d+]/g, "");
    // Fix double plus if any
    const finalPhone = cleanNumber.replace(/^\+\+/, "+");


    if (type === "call") {
      window.location.href = `tel:${finalPhone}`;
    } else if (type === "sms") {
      const appName = "Nail Visual";
      const body = `Hi, I saw your work on ${appName} and would like to book an appointment.`;
      const encodedBody = encodeURIComponent(body);

      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const delimiter = isIOS ? "&" : "?";

      window.location.href = `sms:${finalPhone}${delimiter}body=${encodedBody}`;
    }
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      <Button
        large
        onClick={() => handleContact("sms")}
        className="bg-black text-white"
      >
        <MessageCircle className="w-5 h-5 mr-2" />
        Text
      </Button>
      <Button
        large
        outline
        onClick={() => handleContact("call")}
        className="border-gray-200"
      >
        <Phone className="w-5 h-5 mr-2" />
        Call
      </Button>
    </div>
  );
}
