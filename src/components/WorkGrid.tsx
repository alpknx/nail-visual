"use client";
import { useQuery } from "@tanstack/react-query";
import { listWorks } from "@/lib/api";

export default function WorkGrid() {
    const { data, isLoading, isFetching } = useQuery({
        queryKey: ["works"],
        queryFn: () => listWorks({}),
    });

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
            {data?.map((w) => (
                <figure key={w.id} className="rounded-2xl overflow-hidden border">
                    <img src={w.imageUrl} alt={w.caption ?? ""} className="aspect-[4/5] object-cover w-full" />
                    <figcaption className="p-2 text-sm opacity-70 flex items-center gap-2">
                        <span>{w.tags?.length ? w.tags.join(" • ") : "—"}</span>
                        {isFetching && <span className="opacity-50">⟲</span>}
                    </figcaption>
                </figure>
            ))}
        </div>
    );
}
