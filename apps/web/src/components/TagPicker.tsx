"use client";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchTags } from "@/lib/meta";
import { Badge } from "@/components/ui/badge";
import type { Tag } from "@/lib/api";

export default function TagPicker({
                                      selected, onToggle, limit = 12,
                                  }: { selected: Tag[]; onToggle: (t: Tag) => void; limit?: number  }) {
    const { data: all = [] } = useQuery({ queryKey: ["tags"], queryFn: fetchTags });
    const tags = useMemo(() => (all as Tag[]).slice(0, limit), [all, limit]);

    return (
        <div className="flex flex-wrap gap-2">
            {tags.map((t) => {
                const active = selected.includes(t);
                return (
                    <Badge
                        key={t}
                        variant={active ? "default" : "outline"}
                        className="cursor-pointer select-none"
                        onClick={() => onToggle(t)}
                    >
                        {t}
                    </Badge>
                );
            })}
        </div>
    );
}
