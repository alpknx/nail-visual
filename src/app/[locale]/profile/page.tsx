"use client";

import { useSession } from "next-auth/react";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function ClientProfilePage() {
  const { data: session, update: updateSession } = useSession();
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
      toast.success("Профиль обновлен");
      await updateSession();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (!session) {
    return <p className="text-center py-12 opacity-70">Необходимо авторизоваться</p>;
  }

  return (
    <section className="max-w-md mx-auto py-8 pt-16 md:pt-8 px-4">
      <h1 className="text-2xl font-semibold mb-6">Мой профиль</h1>

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

        <div className="pt-4">
          <Button
            type="submit"
            disabled={updateMutation.isPending}
            className="w-full"
          >
            {updateMutation.isPending ? "Сохранение..." : "Сохранить"}
          </Button>
        </div>

        <p className="text-xs opacity-70 text-center">
          Email: {session.user?.email}
        </p>
      </form>
    </section>
  );
}
