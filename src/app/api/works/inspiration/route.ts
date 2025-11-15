import { NextResponse } from "next/server";
import { mapUnsplashTags, pickBestPhotoUrl, searchUnsplashPhotos } from "@/lib/unsplash";
import { CITIES, type City, type Tag, type Work } from "@/lib/domain";

const DEFAULT_CITY: City = CITIES[0];
const CITY_SET = new Set<string>(CITIES as ReadonlyArray<string>);

function pickQuery(tagsParam: string | null, explicitQuery: string | null): string {
    if (explicitQuery) return explicitQuery;
    if (!tagsParam) return "nail art";

    const [firstTag] = tagsParam.split(",").map((tag) => tag.trim()).filter(Boolean);
    if (!firstTag) return "nail art";

    return `${firstTag} nail art`;
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const tagList = searchParams.get("tags");
    const query = pickQuery(tagList, searchParams.get("query"));
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

        const tagFilterValues = tagList
            ? (tagList.split(",").map((tag) => tag.trim()).filter(Boolean) as Tag[])
            : [];
        const tagFilter = new Set<Tag>(tagFilterValues);

        const data = photos.reduce<Work[]>((acc, photo) => {
            const imageUrl = pickBestPhotoUrl(photo);
            if (!imageUrl) return acc;

            const tags = mapUnsplashTags(photo.tags);
            const filteredTags = tagFilter.size
                ? tags.filter((tag) => tagFilter.has(tag))
                : tags;

            acc.push({
                id: `unsplash_work_${photo.id}`,
                proId: "unsplash",
                imageUrl,
                caption: photo.description ?? photo.alt_description ?? null,
                tags: filteredTags,
                city,
                createdAt: photo.created_at ?? new Date().toISOString(),
            });

            return acc;
        }, []);

        const response = NextResponse.json({ data });
        response.headers.set("Cache-Control", "public, s-maxage=600, stale-while-revalidate=3600");
        return response;
    } catch (error) {
        console.error("[works-inspiration] failed to fetch Unsplash data", error);
        return NextResponse.json({ data: [] }, { status: 503 });
    }
}
