import type { City, Tag } from "@/lib/api";

export type Reference = {
    id: string;
    imageUrl: string;
    city: City;
    tags: Tag[];
    note?: string;
    createdAt: string;
    status: "open" | "matched" | "closed";
};

export const REFERENCES: Reference[] = [];