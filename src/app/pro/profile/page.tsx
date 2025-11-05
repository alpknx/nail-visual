"use client";

import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function ProProfilePage() {
  const { data: session, update: updateSession } = useSession();
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
    return <p className="text-center py-12 opacity-70">Необходимо авторизоваться</p>;
  }

  if (session.user?.role !== "pro") {
    return <p className="text-center py-12 opacity-70">Эта страница доступна только для мастеров</p>;
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
      if (!res1.ok) throw new Error("Не удалось обновить профиль");

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
      if (!res2.ok) throw new Error("Не удалось обновить профиль мастера");

      toast.success("Профиль обновлен");
      await updateSession();
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      toast.error(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <section className="max-w-md mx-auto py-8 pt-16 md:pt-8 px-4">
      <h1 className="text-2xl font-semibold mb-6">Мой профиль мастера</h1>

      {profileLoading && <p className="opacity-70">Загружаем...</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Имя</label>
          <Input
            type="text"
            placeholder="Ваше имя"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Телефон</label>
          <Input
            type="tel"
            placeholder="+48 XX XXX XXXX"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Город</label>
          <Input
            type="text"
            placeholder="Город"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">О себе</label>
          <Textarea
            placeholder="Расскажите о вашем опыте и стиле..."
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            className="h-24"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Instagram</label>
          <Input
            type="text"
            placeholder="@username"
            value={formData.instagram}
            onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Минимальная цена (PLN)</label>
          <Input
            type="number"
            placeholder="100"
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
            {isUpdating ? "Сохранение..." : "Сохранить"}
          </Button>
        </div>

        <p className="text-xs opacity-70 text-center">
          Email: {session.user?.email}
        </p>
      </form>
    </section>
  );
}
