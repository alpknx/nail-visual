// серверный in-memory стор (переживает запросы, но не HMR)
// позже заменим на БД (Neon+Drizzle)

import type { City, Tag } from "@/lib/api";

export type Work = {
    id: string;
    imageUrl: string;
    caption?: string;
    city: City;
    tags: Tag[];
    proId: string;
    createdAt: string; // ISO
};

const works: Work[] = [];

function uid() {
    return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

export const store = {
    listWorks(): Work[] {
        // можно добавить сортировку по дате
        return [...works].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    },
    createWork(input: Omit<Work, "id" | "createdAt">): Work {
        const w: Work = { id: uid(), createdAt: new Date().toISOString(), ...input };
        works.push(w);
        return w;
    },
};
