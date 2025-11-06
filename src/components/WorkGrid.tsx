"use client";
import { useQuery } from "@tanstack/react-query";
import { listWorks } from "@/lib/api";
import Link from "next/link";
import Image from "next/image";
import { usePrefetchPro } from "@/lib/usePrefetch";

export default function WorkGrid() {
    const { data, isLoading, isFetching } = useQuery({
        queryKey: ["works"],
        queryFn: () => listWorks({}),
    });

    const { prefetch } = usePrefetchPro();

    if (isLoading) {
        return (
            <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-[280px] rounded-2xl border animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
            {data?.map((w, index) => (
                <Link 
                    key={w.id} 
                    href={`/pro/${w.proId}/portfolio`}
                    className="rounded-2xl overflow-hidden border hover:border-foreground transition-colors cursor-pointer"
                    onMouseEnter={() => prefetch(w.proId)}
                >
                    <figure className="relative aspect-[4/5]">
                        <Image 
                            src={w.imageUrl} 
                            alt={w.caption ?? "Работа мастера"} 
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            className="object-cover"
                            priority={index === 0}
                        />
                        <figcaption className="absolute bottom-0 left-0 right-0 p-2 text-sm opacity-70 flex items-center gap-2 bg-gradient-to-t from-black/50 to-transparent">
                            <span>{w.tags?.length ? w.tags.join(" • ") : "—"}</span>
                            {isFetching && <span className="opacity-50">⟲</span>}
                        </figcaption>
                    </figure>
                </Link>
            ))}
        </div>
    );
}
