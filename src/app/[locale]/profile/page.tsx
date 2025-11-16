"use client";

import { useSession } from "next-auth/react";
import { useTranslations } from 'next-intl';
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

// Prevent static generation - this page requires authentication
export const dynamic = 'force-dynamic';

export default function ClientProfilePage() {
  const t = useTranslations('profile');
  const tCommon = useTranslations('common');
  const sessionResult = useSession();
  const session = sessionResult?.data ?? null;
  const updateSession = sessionResult?.update;
  const user = session?.user as { id: string; name?: string; email?: string; image?: string; phone?: string; city?: string; role: string };
  const [formData, setFormData] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    city: user?.city || "",
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: async () => {
      toast.success(t('updated'));
      if (updateSession) {
        await updateSession();
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (!session) {
    return <p className="text-center py-12 opacity-70">{t('needAuth')}</p>;
  }

  return (
    <section className="max-w-md mx-auto py-8 pt-16 md:pt-8 px-4">
      <h1 className="text-2xl font-semibold mb-6">{t('title')}</h1>

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

        <div className="pt-4">
          <Button
            type="submit"
            disabled={updateMutation.isPending}
            className="w-full"
          >
            {updateMutation.isPending ? tCommon('saving') : tCommon('save')}
          </Button>
        </div>

        <p className="text-xs opacity-70 text-center">
          Email: {session.user?.email}
        </p>
      </form>
    </section>
  );
}
