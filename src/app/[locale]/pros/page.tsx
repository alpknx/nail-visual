// apps/web/src/app/pros/page.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { listPros, type ProSummary } from "@/lib/api";
import Image from "next/image";
import Link from "next/link";

export default function ProsPage() {
    const { data, isLoading } = useQuery({
        queryKey: ["pros"],
        queryFn: () => listPros({ limit: 50 }),
    });

    if (isLoading) {
        return (
            <div className="grid gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-24 rounded-xl border animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data?.map((p: ProSummary) => {
                const city = p.cities?.[0] ?? "—";
                return (
                    <Link
                        key={p.proId} // ✅ уникальный ключ
                        href={`/pros/${p.proId}`} // ✅ правильный id в ссылке
                        className="p-3 rounded-xl border flex items-center gap-3 hover:bg-muted/30"
                    >
                        <div className="relative w-12 h-12 rounded-full overflow-hidden bg-muted">
                            {p.sampleUrl ? (
                                <Image 
                                    src={p.sampleUrl} 
                                    alt={`Мастер ${p.proId.slice(0, 6)}`}
                                    fill
                                    sizes="48px"
                                    className="object-cover" 
                                />
                            ) : null}
                        </div>
                        <div className="min-w-0">
                            <div className="font-medium truncate">Мастер {p.proId.slice(0, 6)}</div>
                            <div className="text-xs opacity-70">
                                {city} • работ: {p.worksCount}
                            </div>
                            {!!p.tags.length && (
                                <div className="text-[11px] opacity-60 truncate">{p.tags.join(" • ")}</div>
                            )}
                        </div>
                    </Link>
                );
            })}
        </div>
    );
}
