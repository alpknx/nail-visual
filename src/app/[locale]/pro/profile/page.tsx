"use client";

import { useSession } from "next-auth/react";
import { useTranslations } from 'next-intl';
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import CitySelect from "@/components/CitySelect";
import { toast } from "sonner";
import { CITIES, type City } from "@/lib/api";
import { useGeolocationContext } from "@/contexts/GeolocationContext";
import { useRouter } from "@/i18n/routing";
import { Plus } from "lucide-react";

// Prevent static generation - this page requires authentication
export const dynamic = 'force-dynamic';

export default function ProProfilePage() {
  const t = useTranslations('pro.profile');
  const tCommon = useTranslations('common');
  const sessionResult = useSession();
  const session = sessionResult?.data ?? null;
  const updateSession = sessionResult?.update;
  const isLoadingSession = sessionResult?.status === "loading";
  const user = session?.user as { id: string; name?: string; email?: string; image?: string; phone?: string; city?: string; role: string };
  
  // Safe wrapper for translations with fallbacks
  const safeT = (key: string, fallback?: string) => {
    try {
      return t(key);
    } catch {
      return fallback || key;
    }
  };
  
  const safeTCommon = (key: string, fallback?: string) => {
    try {
      return tCommon(key);
    } catch {
      return fallback || key;
    }
  };

  const [formData, setFormData] = useState({
    name: user?.name || "",
    city: user?.city || "",
    bio: "",
    instagram: "",
    facebook: "",
    whatsapp: "",
    telegram: "",
    phoneProfile: "",
    externalLink: "",
    minPricePln: "",
  });

  const [isUpdating, setIsUpdating] = useState(false);
  const { detectedCity, locationWarning, clearWarning } = useGeolocationContext();
  const router = useRouter();

  // Загрузить профиль мастера
  const { data: proProfile, isLoading: profileLoading, error: profileError } = useQuery({
    queryKey: ["pro-profile", session?.user?.id],
    queryFn: async () => {
      const res = await fetch("/api/pros/me");
      if (!res.ok) {
        // Log error but don't throw - allow form to render with empty fields
        console.error("Failed to load pro profile:", res.status, res.statusText);
        return null;
      }
      return res.json();
    },
    enabled: !!session?.user?.id,
    retry: false, // Don't retry on 401/403 errors
  });

  // Заполнить форму данными из профиля мастера
  useEffect(() => {
    if (proProfile) {
      setFormData((prev) => ({
        ...prev,
        bio: proProfile.data?.bio || "",
        instagram: proProfile.data?.instagram || "",
        facebook: proProfile.data?.facebook || "",
        whatsapp: proProfile.data?.whatsapp || "",
        telegram: proProfile.data?.telegram || "",
        phoneProfile: proProfile.data?.phone || "",
        externalLink: proProfile.data?.externalLink || "",
        minPricePln: proProfile.data?.minPricePln || "",
      }));
    }
  }, [proProfile]);

  // Автоматически установить город из профиля пользователя при загрузке
  useEffect(() => {
    if (user?.city && CITIES.includes(user.city as City)) {
      setFormData(prev => ({ ...prev, city: user.city || "" }));
    }
  }, [user?.city]);

  // Обновить форму при определении города через геолокацию
  useEffect(() => {
    if (detectedCity) {
      setFormData(prev => ({ ...prev, city: detectedCity }));
    }
  }, [detectedCity]);


  // Show loading state while session is being checked
  if (isLoadingSession) {
    return <p className="text-center py-12 opacity-70">{safeT('loading', 'Loading...')}</p>;
  }

  if (!session) {
    return <p className="text-center py-12 opacity-70">{safeT('needAuth', 'Authentication required')}</p>;
  }

  if (session.user?.role !== "pro") {
    return <p className="text-center py-12 opacity-70">{safeT('prosOnly', 'This page is only available for masters')}</p>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      // Обновить базовую информацию
      const res1 = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          city: formData.city,
        }),
      });
      if (!res1.ok) throw new Error(safeT('updateError', 'Failed to update profile'));

      // Обновить профиль мастера
      const res2 = await fetch("/api/pros/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio: formData.bio || null,
          instagram: formData.instagram || null,
          facebook: formData.facebook || null,
          whatsapp: formData.whatsapp || null,
          telegram: formData.telegram || null,
          phone: formData.phoneProfile || null,
          externalLink: formData.externalLink || null,
          minPricePln: formData.minPricePln ? parseInt(formData.minPricePln) : null,
        }),
      });
      if (!res2.ok) throw new Error(safeT('updateProError', 'Failed to update master profile'));

      toast.success(safeT('updated', 'Profile updated'));
      if (updateSession) {
        await updateSession();
      }
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      toast.error(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  // Fallback translations to prevent errors
  const title = safeT('title', 'Master Profile');
  const addWorkText = safeT('addWork', 'Add Work');
  const loadingText = safeT('loading', 'Loading...');
  const loadErrorText = safeT('loadError', 'Failed to load profile data. You can still edit and save your profile.');

  return (
    <section className="max-w-md mx-auto space-y-6 pt-16 md:pt-4 px-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/works/new")}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          {addWorkText}
        </Button>
      </div>

      {profileLoading && <p className="opacity-70">{loadingText}</p>}
      {profileError && (
        <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            {loadErrorText}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Предупреждение о местоположении вне Польши */}
        {locationWarning && (
          <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 space-y-2">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  {safeT('locationOutsidePolandTitle') || safeTCommon('locationOutsidePolandTitle') || 'Location outside Poland'}
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  {safeT('locationOutsidePolandMessage') || safeTCommon('locationOutsidePolandMessage') || `Your location was detected as ${locationWarning?.city}, ${locationWarning?.country}. This service is available only for Polish cities. Please select a city from the list below.`}
                </p>
              </div>
              <button
                type="button"
                onClick={clearWarning}
                className="flex-shrink-0 text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200"
                aria-label={safeTCommon('close', 'Close')}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">{safeT('nameLabel', 'Name')}</label>
          <Input
            type="text"
            placeholder={safeT('namePlaceholder', 'Your name')}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{safeT('cityLabel', 'City')}</label>
          <CitySelect
            value={formData.city}
            onChange={(city) => setFormData({ ...formData, city })}
            placeholder={safeT('cityPlaceholder') || safeTCommon('selectCity', 'Select city')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{safeT('about', 'About')}</label>
          <Textarea
            placeholder={safeT('aboutPlaceholder', 'Tell us about your experience and style...')}
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            className="h-24"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{safeT('instagram', 'Instagram')}</label>
          <Input
            type="text"
            placeholder={safeT('instagramPlaceholder', '@username')}
            value={formData.instagram}
            onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{safeT('facebook', 'Facebook')}</label>
          <Input
            type="text"
            placeholder={safeT('facebookPlaceholder', 'Facebook link')}
            value={formData.facebook}
            onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{safeT('whatsapp', 'WhatsApp')}</label>
          <Input
            type="tel"
            placeholder={safeT('whatsappPlaceholder', '+48 XX XXX XXXX')}
            value={formData.whatsapp}
            onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{safeT('telegram', 'Telegram')}</label>
          <Input
            type="text"
            placeholder={safeT('telegramPlaceholder', '@username')}
            value={formData.telegram}
            onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{safeT('phoneInProfile', 'Phone (in profile)')}</label>
          <Input
            type="tel"
            placeholder={safeT('phonePlaceholder', '+48 XX XXX XXXX')}
            value={formData.phoneProfile}
            onChange={(e) => setFormData({ ...formData, phoneProfile: e.target.value })}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {safeT('phoneInProfileDescription', 'Phone number in master profile (displayed after clicking "Show contacts")')}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{safeT('externalLink', 'External link')}</label>
          <Input
            type="url"
            placeholder="https://..."
            value={formData.externalLink}
            onChange={(e) => setFormData({ ...formData, externalLink: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{safeT('minPrice', 'Minimum price (PLN)')}</label>
          <Input
            type="number"
            placeholder={safeT('minPricePlaceholder', '100')}
            value={formData.minPricePln}
            onChange={(e) => setFormData({ ...formData, minPricePln: e.target.value })}
          />
        </div>

        <div className="pt-4">
          <Button
            type="submit"
            disabled={isUpdating}
            className="w-full"
          >
            {isUpdating ? safeTCommon('saving', 'Saving...') : safeTCommon('save', 'Save')}
          </Button>
        </div>

        <p className="text-xs opacity-70 text-center">
          Email: {session.user?.email}
        </p>
      </form>
    </section>
  );
}
