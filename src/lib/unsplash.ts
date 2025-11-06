import { TAGS, type Tag } from "@/lib/domain";

const UNSPLASH_API_URL = "https://api.unsplash.com";

export type UnsplashPhoto = {
    id: string;
    description: string | null;
    alt_description: string | null;
    created_at: string;
    urls: {
        raw?: string;
        full?: string;
        regular?: string;
        small?: string;
        thumb?: string;
    };
    links?: {
        html?: string;
    };
    user?: {
        name?: string;
        username?: string;
        portfolio_url?: string | null;
    };
    tags?: Array<{ title?: string }>;
};

type SearchOptions = {
    query?: string;
    page?: number;
    perPage?: number;
    orientation?: "landscape" | "portrait" | "squarish";
    contentFilter?: "low" | "high";
    signal?: AbortSignal;
};

export async function searchUnsplashPhotos(options: SearchOptions = {}): Promise<UnsplashPhoto[]> {
    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!accessKey) {
        throw new Error("UNSPLASH_ACCESS_KEY is not configured");
    }

    const {
        query = "nail art",
        page = 1,
        perPage = 24,
        orientation = "portrait",
        contentFilter = "high",
        signal,
    } = options;

    const url = new URL(`${UNSPLASH_API_URL}/search/photos`);
    url.searchParams.set("query", query);
    url.searchParams.set("page", String(page));
    url.searchParams.set("per_page", String(Math.min(perPage, 30)));
    url.searchParams.set("orientation", orientation);
    url.searchParams.set("content_filter", contentFilter);

    const response = await fetch(url.toString(), {
        headers: {
            Authorization: `Client-ID ${accessKey}`,
            "Accept-Version": "v1",
        },
        signal,
        cache: "no-store",
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Unsplash request failed (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    return Array.isArray(data.results) ? (data.results as UnsplashPhoto[]) : [];
}

const TAG_SET = new Set<string>(TAGS as ReadonlyArray<string>);

export function pickBestPhotoUrl(photo: UnsplashPhoto): string | null {
    return (
        photo.urls?.regular ||
        photo.urls?.full ||
        photo.urls?.small ||
        photo.urls?.thumb ||
        null
    );
}

export function mapUnsplashTags(rawTags: Array<{ title?: string }> | undefined): Tag[] {
    if (!rawTags?.length) return [];
    const picked = new Set<Tag>();

    for (const raw of rawTags) {
        if (!raw?.title) continue;
        const title = raw.title.toLowerCase();
        const dashed = title.replace(/\s+/g, "-");
        if (TAG_SET.has(dashed)) {
            picked.add(dashed as Tag);
            continue;
        }

        for (const part of title.split(/[\s-]+/)) {
            if (TAG_SET.has(part)) {
                picked.add(part as Tag);
            }
        }
    }

    return Array.from(picked).slice(0, 3);
}
