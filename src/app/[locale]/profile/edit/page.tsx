"use client";

import { useState, useEffect } from "react";
import { getProfile, updateProfile } from "@/app/actions";
import { Page, Navbar, List, ListInput, Button, Block, BlockTitle, NavbarBackLink } from "konsta/react";
import { useRouter } from "next/navigation";

export default function EditProfilePage() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [city, setCity] = useState("");
  const [addressText, setAddressText] = useState("");
  const [bio, setBio] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await getProfile();
        if (profile) {
          setBusinessName(profile.businessName);
          setPhoneNumber(profile.phoneNumber);
          setCity(profile.city || "");
          setAddressText(profile.addressText || "");
          setBio(profile.bio || "");
        }
      } catch (e) {
        console.error(e);
        setError("Failed to load profile");
      } finally {
        setFetching(false);
      }
    };
    loadProfile();
  }, []);

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
      await updateProfile({
        businessName,
        phoneNumber,
        city,
        addressText,
        bio,
      });
      router.push("/profile");
    } catch (e) {
      console.error(e);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <Page>
        <Navbar title="Edit Profile" />
        <Block className="text-center mt-10">Loading...</Block>
      </Page>
    );
  }

  return (
    <Page>
      <Navbar
        title="Edit Profile"
        left={
          <NavbarBackLink onClick={() => router.back()} text="Back" />
        }
      />

      <BlockTitle>Update your business information</BlockTitle>

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

        <ListInput
          outline
          label="Bio (Optional)"
          type="textarea"
          placeholder="Tell us about yourself..."
          value={bio}
          onInput={(e: any) => setBio(e.target.value)}
          inputClassName="!h-20 resize-none"
        />
      </List>

      {error && (
        <Block className="text-red-500 text-sm text-center">
          {error}
        </Block>
      )}

      <Block>
        <Button large onClick={handleSubmit} disabled={loading}>
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </Block>
    </Page>
  );
}
