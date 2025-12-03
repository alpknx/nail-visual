"use client";

import { useState } from "react";
import { completeOnboarding } from "@/app/actions";
import { Page, Navbar, List, ListInput, Button, Block, BlockTitle } from "konsta/react";

export default function OnboardingPage() {
  const [businessName, setBusinessName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [city, setCity] = useState("");
  const [addressText, setAddressText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");

    if (!businessName) {
      setError("Business Name is required");
      return;
    }
    if (!phoneNumber) {
      setError("Phone Number is required");
      return;
    }

    setLoading(true);

    try {
      await completeOnboarding({
        businessName,
        phoneNumber,
        city,
        addressText,
      });
      // If successful, redirect will happen on server side
      // Don't set loading to false here as page will redirect
    } catch (e: any) {
      // Check if it's a redirect error (NEXT_REDIRECT) - don't show error for redirects
      // Next.js redirect() throws a special error that we should ignore
      if (
        e?.digest?.startsWith('NEXT_REDIRECT') || 
        e?.message?.includes('NEXT_REDIRECT') ||
        e?.digest === 'NEXT_REDIRECT;replace' ||
        e?.digest === 'NEXT_REDIRECT;push'
      ) {
        // This is a redirect, not an error - let it happen
        return;
      }
      console.error(e);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <Page>
      <Navbar title="Complete your Profile" />

      <BlockTitle>Tell us about your business to get started.</BlockTitle>

      <List strong inset>
        <ListInput
          outline
          label="Business Name"
          type="text"
          placeholder="e.g. Elena's Nails"
          value={businessName}
          onInput={(e: any) => setBusinessName(e.target.value)}
        />

        <ListInput
          outline
          label="Phone Number"
          type="tel"
          placeholder="+1 234 567 8900"
          value={phoneNumber}
          onInput={(e: any) => setPhoneNumber(e.target.value)}
        />

        <ListInput
          outline
          label="City"
          type="text"
          placeholder="e.g. New York"
          value={city}
          onInput={(e: any) => setCity(e.target.value)}
        />

        <ListInput
          outline
          label="Address (Optional)"
          type="text"
          placeholder="e.g. 123 Main St"
          value={addressText}
          onInput={(e: any) => setAddressText(e.target.value)}
        />
      </List>

      {error && (
        <Block className="text-red-500 text-sm text-center">
          {error}
        </Block>
      )}

      <Block>
        <Button large onClick={handleSubmit} disabled={loading}>
          {loading ? "Saving..." : "Start"}
        </Button>
      </Block>
    </Page>
  );
}
