import { NextResponse } from "next/server";
import { mapUnsplashTags, pickBestPhotoUrl, searchUnsplashPhotos } from "@/lib/unsplash";
import { CITIES, type ClientReference, type City } from "@/lib/domain";

const DEFAULT_CITY: City = CITIES[0];

const CITY_SET = new Set<string>(CITIES as ReadonlyArray<string>);

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query") ?? "nail art";
    const perPage = Math.min(Number(searchParams.get("limit") || 24), 30);
    const requestedCity = searchParams.get("city");
    const city = requestedCity && CITY_SET.has(requestedCity) ? (requestedCity as City) : DEFAULT_CITY;

    try {
        const photos = await searchUnsplashPhotos({
            query,
            perPage,
            orientation: "portrait",
            contentFilter: "high",
        });

        const data = photos.reduce<ClientReference[]>((acc, photo) => {
            const imageUrl = pickBestPhotoUrl(photo);
            if (!imageUrl) return acc;

            const note = photo.description ?? photo.alt_description ?? null;
            const tags = mapUnsplashTags(photo.tags);

            acc.push({
                id: `unsplash_${photo.id}`,
                clientId: "unsplash",
                imageUrl,
                note,
                tags,
                city,
                status: "external",
                createdAt: photo.created_at ?? new Date().toISOString(),
            });

            return acc;
        }, []);

        const response = NextResponse.json({ data });
        response.headers.set("Cache-Control", "public, s-maxage=600, stale-while-revalidate=3600");
        return response;
    } catch (error) {
        console.error("[reference-inspiration] failed to fetch Unsplash data", error);
        return NextResponse.json({ data: [] }, { status: 503 });
    }
}
