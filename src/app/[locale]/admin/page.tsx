"use client";

import { useTranslations } from 'next-intl';
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import {
    listWorks,
    listReferences,
    CITIES,
    TAGS,
    type Work,
    type ClientReference,
} from "@/lib/api";

export default function AdminPage() {
    const t = useTranslations('admin');
    const tCommon = useTranslations('common');
    // ЯВНО указываем дженерики, чтобы data имела корректный тип, а не {}
    const { data: works = [] } = useQuery<Work[]>({
        queryKey: ["works"],
        queryFn: () => listWorks(),
    });

    const { data: refsRaw = [] } = useQuery<ClientReference[]>({
        queryKey: ["references"],
        queryFn: () => listReferences(),
    });

    const [city, setCity] = useState<string>("");
    const [tag, setTag] = useState<string>("");

    const fWorks = useMemo(
        () =>
            works.filter(
                (w) => (!city || w.city === city) && (!tag || w.tags.includes(tag as "french" | "ombre" | "nude" | "red" | "black" | "white" | "chrome" | "cat-eye" | "glitter" | "pastel"))
            ),
        [works, city, tag]
    );

    const fRefs = useMemo(
        () =>
            refsRaw.filter(
                (r) => (!city || r.city === city) && (!tag || r.tags.includes(tag as "french" | "ombre" | "nude" | "red" | "black" | "white" | "chrome" | "cat-eye" | "glitter" | "pastel"))
            ),
        [refsRaw, city, tag]
    );

    return (
        <section className="space-y-6">
            <header className="flex items-end gap-3">
                <h1 className="text-2xl font-semibold">{t('title')}</h1>
                <div className="ml-auto flex gap-2">
                    <select
                        className="border rounded-md h-9 px-2"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                    >
                        <option value="">{tCommon('allCities')}</option>
                        {CITIES.map((c) => (
                            <option key={c} value={c}>
                                {c}
                            </option>
                        ))}
                    </select>
                    <select
                        className="border rounded-md h-9 px-2"
                        value={tag}
                        onChange={(e) => setTag(e.target.value)}
                    >
                        <option value="">{t('allTags')}</option>
                        {TAGS.map((tag) => (
                            <option key={tag} value={tag}>
                                {tag}
                            </option>
                        ))}
                    </select>
                </div>
            </header>

            <section className="space-y-3">
                <h2 className="text-lg font-semibold">{t('works')} ({fWorks.length})</h2>
                {!fWorks.length ? (
                    <p className="opacity-70">{t('noWorks')}</p>
                ) : (
                    <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
                        {fWorks.map((w) => (
                            <figure key={w.id} className="rounded-xl overflow-hidden border">
                                <div className="relative aspect-[4/5]">
                                    <Image src={w.imageUrl} alt="" fill className="object-cover" />
                                </div>
                                <figcaption className="p-2 text-xs opacity-70">
                                    {w.city} • {w.tags.join(" • ")}
                                </figcaption>
                            </figure>
                        ))}
                    </div>
                )}
            </section>

            <section className="space-y-3">
                <h2 className="text-lg font-semibold">{t('references')} ({fRefs.length})</h2>
                {!fRefs.length ? (
                    <p className="opacity-70">{t('noReferences')}</p>
                ) : (
                    <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
                        {fRefs.map((r) => (
                            <figure key={r.id} className="rounded-xl overflow-hidden border">
                                <div className="relative aspect-[4/5]">
                                    <Image src={r.imageUrl} alt="" fill className="object-cover" />
                                </div>
                                <figcaption className="p-2 text-xs opacity-70">
                                    {r.city} • {r.tags.join(" • ")}{r.status ? ` • ${r.status}` : ""}
                                </figcaption>
                            </figure>
                        ))}
                    </div>
                )}
            </section>
        </section>
    );
}
