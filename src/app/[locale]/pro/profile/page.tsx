"use client";

import { useSession } from "next-auth/react";
import { useTranslations } from 'next-intl';
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

// Prevent static generation - this page requires authentication
export const dynamic = 'force-dynamic';

export default function ProProfilePage() {
  const t = useTranslations('pro.profile');
  const tCommon = useTranslations('common');
  const sessionResult = useSession();
  const session = sessionResult?.data ?? null;
  const updateSession = sessionResult?.update;
  const user = session?.user as { id: string; name?: string; email?: string; image?: string; phone?: string; city?: string; role: string };

  const [formData, setFormData] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    city: user?.city || "",
    bio: "",
    instagram: "",
    minPricePln: "",
  });

  const [isUpdating, setIsUpdating] = useState(false);

  // Загрузить профиль мастера
  const { data: proProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["pro-profile", session?.user?.id],
    queryFn: async () => {
      const res = await fetch("/api/pros/me");
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!session?.user?.id,
  });

  // Заполнить форму данными из профиля мастера
  useEffect(() => {
    if (proProfile) {
      setFormData((prev) => ({
        ...prev,
        bio: proProfile.data?.bio || "",
        instagram: proProfile.data?.instagram || "",
        minPricePln: proProfile.data?.minPricePln || "",
      }));
    }
  }, [proProfile]);

  if (!session) {
    return <p className="text-center py-12 opacity-70">{t('needAuth')}</p>;
  }

  if (session.user?.role !== "pro") {
    return <p className="text-center py-12 opacity-70">{t('prosOnly')}</p>;
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
          phone: formData.phone,
          city: formData.city,
        }),
      });
      if (!res1.ok) throw new Error(t('updateError'));

      // Обновить профиль мастера
      const res2 = await fetch("/api/pros/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio: formData.bio || null,
          instagram: formData.instagram || null,
          minPricePln: formData.minPricePln ? parseInt(formData.minPricePln) : null,
        }),
      });
      if (!res2.ok) throw new Error(t('updateProError'));

      toast.success(t('updated'));
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

  return (
    <section className="max-w-md mx-auto py-8 pt-16 md:pt-8 px-4">
      <h1 className="text-2xl font-semibold mb-6">{t('title')}</h1>

      {profileLoading && <p className="opacity-70">{t('loading')}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">{t('nameLabel')}</label>
          <Input
            type="text"
            placeholder={t('namePlaceholder')}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{t('phoneLabel')}</label>
          <Input
            type="tel"
            placeholder={t('phonePlaceholder')}
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{t('cityLabel')}</label>
          <Input
            type="text"
            placeholder={t('cityPlaceholder')}
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{t('about')}</label>
          <Textarea
            placeholder={t('aboutPlaceholder')}
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            className="h-24"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{t('instagram')}</label>
          <Input
            type="text"
            placeholder={t('instagramPlaceholder')}
            value={formData.instagram}
            onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{t('minPrice')}</label>
          <Input
            type="number"
            placeholder={t('minPricePlaceholder')}
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
            {isUpdating ? tCommon('saving') : tCommon('save')}
          </Button>
        </div>

        <p className="text-xs opacity-70 text-center">
          Email: {session.user?.email}
        </p>
      </form>
    </section>
  );
}
