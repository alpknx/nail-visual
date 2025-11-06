// Keep domain-wide enums, constants, and shared types detached from browser APIs

export type City = "Kraków" | "Warszawa" | "Wrocław" | "Gdańsk" | "Poznań";
export const CITIES: City[] = ["Kraków", "Warszawa", "Wrocław", "Gdańsk", "Poznań"];

export const TAGS = [
    "french",
    "ombre",
    "nude",
    "red",
    "black",
    "white",
    "chrome",
    "cat-eye",
    "glitter",
    "pastel",
] as const;
export type Tag = (typeof TAGS)[number];

export type Offer = {
    id: string;
    refId: string;
    proId: string;
    message: string | null;
    pricePln: number | null;
    status: "offer" | "accepted" | "declined";
    createdAt: string;
    acceptedAt?: string | null;
    pro?: {
        id: string;
        name: string | null;
        image: string | null;
        phone: string | null;
    };
};

export type Work = {
    id: string;
    imageUrl: string;
    tags: Tag[];
    city: City;
    proId: string;
    caption?: string | null;
    createdAt: string;
};

export type ClientReference = {
    id: string;
    clientId: string;
    imageUrl: string;
    tags: Tag[];
    city: City;
    note?: string | null;
    status?: string;
    createdAt: string;
};
