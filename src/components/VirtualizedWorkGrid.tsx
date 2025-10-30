"use client";

import { useQuery } from "@tanstack/react-query";
import { listWorks } from "@/lib/api";
import Link from "next/link";
import Image from "next/image";
import { usePrefetchPro } from "@/lib/usePrefetch";
import { useEffect, useRef, useState } from "react";

export default function VirtualizedWorkGrid() {
  const { data, isLoading } = useQuery({
    queryKey: ["works"],
    queryFn: () => listWorks({}),
  });

  const { prefetch } = usePrefetchPro();
  const [visibleIndices, setVisibleIndices] = useState<Set<number>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const newVisibleIndices = new Set(visibleIndices);
        entries.forEach((entry) => {
          const index = Array.from(itemRefs.current.values()).indexOf(entry.target as HTMLDivElement);
          if (entry.isIntersecting) {
            newVisibleIndices.add(index);
          } else {
            newVisibleIndices.delete(index);
          }
        });
        setVisibleIndices(newVisibleIndices);
      },
      { rootMargin: "100px" }
    );

    return () => observerRef.current?.disconnect();
  }, [visibleIndices]);

  useEffect(() => {
    itemRefs.current.forEach((ref) => {
      if (ref && observerRef.current) observerRef.current.observe(ref);
    });
  }, [data?.length]);

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
        <div
          key={w.id}
          ref={(el) => {
            if (el) itemRefs.current.set(index, el);
          }}
        >
          <Link
            href={`/pro/${w.proId}/portfolio`}
            className="rounded-2xl overflow-hidden border hover:border-foreground transition-colors cursor-pointer block"
            onMouseEnter={() => prefetch(w.proId)}
          >
            <figure className="relative aspect-[4/5]">
              {visibleIndices.has(index) ? (
                <Image
                  src={w.imageUrl}
                  alt={w.caption ?? "Работа мастера"}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted animate-pulse" />
              )}
              <figcaption className="absolute bottom-0 left-0 right-0 p-2 text-sm opacity-70 flex items-center gap-2 bg-gradient-to-t from-black/50 to-transparent">
                <span>{w.tags?.length ? w.tags.join(" • ") : "—"}</span>
              </figcaption>
            </figure>
          </Link>
        </div>
      ))}
    </div>
  );
}
