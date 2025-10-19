// единый in-memory стор для нескольких роутов (dev/MVP)
// !!! runtime="nodejs" в роутах обязателен

export type City = "Kraków" | "Warszawa" | "Wrocław" | "Gdańsk" | "Poznań";
export type Tag =
    | "french" | "ombre" | "nude" | "red" | "black"
    | "white" | "chrome" | "cat-eye" | "glitter" | "pastel";

export type ReferenceStatus = "open" | "matched" | "closed";
export type ClientReference = {
    id: string;
    imageUrl: string;
    tags: Tag[];
    city: City;
    note?: string;
    status: ReferenceStatus;
    createdAt: string;
};

export type OfferStatus = "offer" | "accepted" | "declined";
export type Offer = {
    id: string;
    referenceId: string;
    proId: string;
    message?: string;
    status: OfferStatus;
    createdAt: string;
};

export const REFS: ClientReference[] = [];
export const OFFERS: Offer[] = [];

export function uid() {
    return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}
