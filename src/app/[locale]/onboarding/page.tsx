"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { completeOnboarding } from "@/app/actions";
import { useState } from "react";
import { useRouter } from "next/navigation";

const onboardingSchema = z.object({
  businessName: z.string().min(1, "Business Name is required"),
  phoneNumber: z.string().min(1, "Phone Number is required"),
  addressText: z.string().optional(),
  city: z.string().optional(),
});

type OnboardingForm = z.infer<typeof onboardingSchema>;

export default function OnboardingPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingForm>({
    resolver: zodResolver(onboardingSchema),
  });

  const onSubmit = async (data: OnboardingForm) => {
    try {
      await completeOnboarding(data);
      // Redirect is handled in server action, but if it throws:
    } catch (e) {
      console.error(e);
      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Complete your Profile</h1>
          <p className="text-sm text-muted-foreground">
            Tell us about your business to get started.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                    {error}
                </div>
            )}
          <div className="space-y-2">
            <label htmlFor="businessName" className="text-sm font-medium">
              Business Name
            </label>
            <Input
              id="businessName"
              {...register("businessName")}
              placeholder="e.g. Elena's Nails"
            />
            {errors.businessName && (
              <p className="text-sm text-destructive">
                {errors.businessName.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="phoneNumber" className="text-sm font-medium">
              Phone Number
            </label>
            <Input
              id="phoneNumber"
              {...register("phoneNumber")}
              placeholder="+1 234 567 8900"
            />
            {errors.phoneNumber && (
              <p className="text-sm text-destructive">
                {errors.phoneNumber.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="city" className="text-sm font-medium">
              City
            </label>
            <Input
              id="city"
              {...register("city")}
              placeholder="e.g. New York"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="addressText" className="text-sm font-medium">
              Address (Optional)
            </label>
            <Input
              id="addressText"
              {...register("addressText")}
              placeholder="e.g. 123 Main St"
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Start Dashboard"}
          </Button>
        </form>
      </div>
    </div>
  );
}
