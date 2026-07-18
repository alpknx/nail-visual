"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { masterProfiles } from "@/db/schema";
import { z } from "zod";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getLocaleFromHeaders } from "./shared";

const onboardingSchema = z.object({
  businessName: z.string().min(1, "Business Name is required"),
  phoneNumber: z.string().min(1, "Phone Number is required"),
  addressText: z.string().optional(),
  city: z.string().optional(),
});

export async function completeOnboarding(formData: z.infer<typeof onboardingSchema>) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== "master") {
    throw new Error("Unauthorized");
  }

  const validated = onboardingSchema.parse(formData);

  await db.insert(masterProfiles).values({
    userId: session.user.id,
    businessName: validated.businessName,
    phoneNumber: validated.phoneNumber,
    addressText: validated.addressText,
    city: validated.city,
  }).onConflictDoUpdate({
    target: masterProfiles.userId,
    set: {
      businessName: validated.businessName,
      phoneNumber: validated.phoneNumber,
      addressText: validated.addressText,
      city: validated.city,
      updatedAt: new Date(),
    }
  });

  // Get locale from headers to preserve it in redirect
  const locale = await getLocaleFromHeaders();
  redirect(`/${locale}/profile`);
}

export async function getProfile() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return null;
  }

  const profile = await db.query.masterProfiles.findFirst({
    where: eq(masterProfiles.userId, session.user.id),
  });

  return profile;
}

const updateProfileSchema = z.object({
  businessName: z.string().min(1, "Business Name is required"),
  phoneNumber: z.string().min(1, "Phone Number is required"),
  addressText: z.string().optional(),
  city: z.string().optional(),
  bio: z.string().optional(),
});

export async function updateProfile(data: z.infer<typeof updateProfileSchema>) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== "master") {
    throw new Error("Unauthorized");
  }

  const validated = updateProfileSchema.parse(data);

  await db.update(masterProfiles)
    .set({
      businessName: validated.businessName,
      phoneNumber: validated.phoneNumber,
      addressText: validated.addressText,
      city: validated.city,
      bio: validated.bio,
      updatedAt: new Date(),
    })
    .where(eq(masterProfiles.userId, session.user.id));

  return { success: true };
}
