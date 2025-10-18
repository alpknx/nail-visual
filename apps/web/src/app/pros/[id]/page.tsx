// apps/web/src/app/pros/[id]/page.tsx
"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getProProfile, listWorks, type Work } from "@/lib/api";
import Image from "next/image";

export default function ProDetailPage() {
    // безопасно берём id (строка/массив → строка)
    const params = useParams<{ id?: string | string[] }>();
    const id = React.useMemo(() => {
        const raw = params?.id;
        return Array.isArray(raw) ? raw[0] : raw;
    }, [params]);

    // профиль мастера
    const {
        data: profile,
        isLoading: profileLoading,
        error: profileError,
    } = useQuery({
        queryKey: ["pro", id],
        queryFn: () => getProProfile(id as string),
        enabled: !!id,
    });

    // его работы — просим у API сразу по proId (не тянем все)
    const {
        data: works,
        isLoading: worksLoading,
        error: worksError,
    } = useQuery({
        queryKey: ["works", "by-pro", id],
        queryFn: () => listWorks({ proId: id as string, limit: 60 }),
        enabled: !!id,
    });

    if (!id) return <p className="opacity-70">Загружаем…</p>;

    const loading = profileLoading || worksLoading;

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-16 rounded-2xl border animate-pulse" />
                <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="h-[280px] rounded-2xl border animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (profileError) return <p className="text-red-600">Не удалось загрузить профиль</p>;
    if (worksError) return <p className="text-red-600">Не удалось загрузить работы</p>;
    if (!profile) return <p className="opacity-70">Профиль не найден</p>;

    // нормализуем ссылку на инстаграм (разрешим как @handle, так и url)
    const instagramHref = profile.instagram
        ? profile.instagram.startsWith("http")
            ? profile.instagram
            : `https://instagram.com/${profile.instagram.replace(/^@/, "")}`
        : null;

    return (
        <section className="space-y-6">
            <header className="space-y-1">
                <h1 className="text-2xl font-semibold">
                    {profile.name || `Мастер ${String(id).slice(0, 6)}`}{" "}
                    {profile.isVerified ? <span title="Проверенный мастер">✅</span> : null}
                </h1>
                <p className="text-sm opacity-70">
                    {profile.city ? `Город: ${profile.city}` : "Город не указан"}
                    {typeof profile.minPricePln === "number" ? ` • от ${profile.minPricePln} PLN` : ""}
                    {instagramHref ? (
                        <>
                            {" • "}
                            <a href={instagramHref} target="_blank" rel="noreferrer" className="underline">
                                Instagram
                            </a>
                        </>
                    ) : null}
                </p>
                {profile.bio ? <p className="text-sm opacity-80">{profile.bio}</p> : null}
                {!!profile.tags?.length && (
                    <p className="text-xs opacity-60">Теги: {profile.tags.join(" • ")}</p>
                )}
                {!!profile.cities?.length && (
                    <p className="text-xs opacity-60">Города: {profile.cities.join(" • ")}</p>
                )}
            </header>

            {!works?.length ? (
                <p className="opacity-70">У мастера пока нет работ</p>
            ) : (
                <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
                    {works.map((w: Work) => (
                        <figure key={w.id} className="rounded-2xl overflow-hidden border">
                            <div className="relative aspect-[4/5]">
                                <img
                                    src={w.imageUrl}
                                    alt={w.caption ?? ""}
                                    sizes="(max-width: 768px) 50vw, 25vw"
                                    className="object-cover"
                                />
                            </div>
                            <figcaption className="p-2 text-sm opacity-70">
                                {w.tags?.length ? w.tags.join(" • ") : "без тегов"}
                            </figcaption>
                        </figure>
                    ))}
                </div>
            )}
        </section>
    );
}
