"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import CitySelect from "@/components/CitySelect";
import { type City } from "@/lib/api";
import { useState } from "react";

interface Reference {
  id: string;
  imageUrl: string;
  note?: string;
  city: City;
  tags?: string[];
  status: "open" | "matched" | "closed";
}

export default function ReferencesList() {
  const searchParams = useSearchParams();
  const initialCity = (searchParams.get("city") as City | null) || undefined;
  const [selectedCity, setSelectedCity] = useState<City | undefined>(initialCity);

  // Fetch все референсы (или отфильтрованные по городу)
  const { data: references, isLoading } = useQuery({
    queryKey: ["references", selectedCity],
    queryFn: async () => {
      const url = new URL("/api/references", window.location.origin);
      if (selectedCity) url.searchParams.set("city", selectedCity);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Не удалось загрузить референсы");
      const json = await res.json();
      return json.data || [];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-40 rounded-xl border animate-pulse bg-muted" />
        ))}
      </div>
    );
  }

  const refs = references || [];

  return (
    <div className="space-y-4">
      <div className="sticky top-0 bg-white z-10 pb-4">
        <CitySelect
          value={selectedCity}
          onChange={setSelectedCity}
          placeholder="Все города"
        />
      </div>

      {refs.length === 0 ? (
        <p className="text-center opacity-70 py-12">Нет референсов в этом городе</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {refs.map((ref: Reference) => (
            <Link
              key={ref.id}
              href={`/references/${ref.id}`}
              className="group border rounded-xl overflow-hidden hover:shadow-md transition"
            >
              <div className="relative h-48 bg-muted">
                <img
                  src={ref.imageUrl}
                  alt={ref.note || "Референс"}
                  className="object-cover group-hover:scale-105 transition"
                />
                
                {/* Статус бэйдж */}
                <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                  {ref.status === "open" && "🟢 Open"}
                  {ref.status === "matched" && "✅ Matched"}
                </div>
              </div>

              <div className="p-3 space-y-1">
                <p className="text-xs opacity-70">{ref.city}</p>
                <p className="text-xs flex gap-1 flex-wrap">
                  {ref.tags?.slice(0, 3).map((tag: string) => (
                    <span key={tag} className="bg-muted px-2 py-0.5 rounded">
                      {tag}
                    </span>
                  ))}
                  {(ref.tags?.length ?? 0) > 3 && (
                    <span className="text-muted-foreground">+{(ref.tags?.length ?? 0) - 3}</span>
                  )}
                </p>
                {ref.note && <p className="text-sm line-clamp-2">{ref.note}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
