"use client";

import { useTranslations } from 'next-intl';
import { useQuery } from "@tanstack/react-query";
import { listPros, type ProSummary } from "@/lib/api";
import Image from "next/image";
import { Link } from "@/i18n/routing";

export default function ProsPage() {
    const t = useTranslations('masters');
    const tCommon = useTranslations('common');
    const { data, isLoading } = useQuery({
        queryKey: ["pros"],
        queryFn: () => listPros({ limit: 50 }),
    });

    if (isLoading) {
        return (
            <div className="space-y-6 pt-16 md:pt-4">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="aspect-[3/4] rounded-xl border animate-pulse bg-muted" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pt-16 md:pt-4">
            <div>
                <h1 className="text-2xl font-semibold mb-2">{t('title') || 'Мастера'}</h1>
                <p className="text-sm text-muted-foreground">
                    {t('subtitle') || 'Выберите мастера, чтобы посмотреть его работы'}
                </p>
            </div>
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {data?.map((p: ProSummary) => {
                const city = p.cities?.[0] ?? "—";
                return (
                    <Link
                        key={p.proId}
                        href={`/pros/${p.proId}`}
                        className="group rounded-xl border overflow-hidden hover:border-foreground transition-colors"
                    >
                        {/* Превью работы мастера */}
                        <div className="relative aspect-[3/4] bg-muted">
                            {p.sampleUrl ? (
                                <Image 
                                    src={p.sampleUrl} 
                                    alt={`${t('master')} ${p.proId.slice(0, 6)}`}
                                    fill
                                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                    className="object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                    {t('noWorks') || 'Нет работ'}
                                </div>
                            )}
                        </div>
                        {/* Информация о мастере */}
                        <div className="p-3 space-y-1">
                            <div className="font-medium text-sm truncate">{t('master')} {p.proId.slice(0, 6)}</div>
                            <div className="text-xs opacity-70">
                                {city} • {p.worksCount} {t('works') || 'работ'}
                            </div>
                            {!!p.tags.length && (
                                <div className="text-[11px] opacity-60 truncate">{p.tags.slice(0, 2).join(" • ")}</div>
                            )}
                        </div>
                    </Link>
                );
            })}
            </div>
        </div>
    );
}
