import { TAGS, type Tag } from "@/lib/domain";

const PEXELS_API_URL = "https://api.pexels.com/v1";

export type PexelsPhoto = {
    id: number;
    width: number;
    height: number;
    url: string;
    photographer: string;
    photographer_url: string;
    photographer_id: number;
    avg_color?: string;
    src: {
        original: string;
        large2x: string;
        large: string;
        medium: string;
        small: string;
        portrait: string;
        landscape: string;
        tiny: string;
    };
    liked?: boolean;
    alt: string;
};

export type PexelsSearchResponse = {
    total_results: number;
    page: number;
    per_page: number;
    photos: PexelsPhoto[];
    next_page?: string;
};

type SearchOptions = {
    query?: string;
    page?: number;
    perPage?: number;
    orientation?: "landscape" | "portrait" | "square";
    size?: "large" | "medium" | "small";
};

export async function searchPexelsPhotos(options: SearchOptions = {}): Promise<PexelsPhoto[]> {
    // Используем API ключ из переменной окружения или дефолтный
    const accessKey = process.env.PEXELS_API_KEY || "TiDKMoIvWVBEWGFzHO0vyeo1mf6WHZBamlL2ADsLXc1wJkAGHp9OI5te";

    const {
        query = "nail",
        page = 1,
        perPage = 80, // Pexels позволяет до 80 фото за запрос
        orientation = "portrait",
    } = options;

    const url = new URL(`${PEXELS_API_URL}/search`);
    url.searchParams.set("query", query);
    url.searchParams.set("page", String(page));
    url.searchParams.set("per_page", String(Math.min(perPage, 80)));
    url.searchParams.set("orientation", orientation);

    const response = await fetch(url.toString(), {
        headers: {
            Authorization: accessKey,
        },
        cache: "no-store",
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Pexels request failed (${response.status}): ${errorBody}`);
    }

    const data: PexelsSearchResponse = await response.json();
    return Array.isArray(data.photos) ? data.photos : [];
}

export function pickBestPexelsPhotoUrl(photo: PexelsPhoto): string | null {
    return (
        photo.src?.large ||
        photo.src?.medium ||
        photo.src?.portrait ||
        photo.src?.original ||
        null
    );
}

// Маппинг ключевых слов из описания/alt в теги
const TAG_KEYWORDS: Record<string, Tag[]> = {
    "french": ["french"],
    "french manicure": ["french"],
    "french tip": ["french"],
    "ombre": ["ombre"],
    "gradient": ["ombre"],
    "gradient nails": ["ombre"],
    "nude": ["nude"],
    "naked": ["nude"],
    "natural": ["nude"],
    "nude nails": ["nude"],
    "red": ["red"],
    "red nails": ["red"],
    "red polish": ["red"],
    "black": ["black"],
    "black nails": ["black"],
    "black polish": ["black"],
    "white": ["white"],
    "white nails": ["white"],
    "white polish": ["white"],
    "chrome": ["chrome"],
    "metallic": ["chrome"],
    "chrome nails": ["chrome"],
    "mirror": ["chrome"],
    "cat-eye": ["cat-eye"],
    "cat eye": ["cat-eye"],
    "magnetic": ["cat-eye"],
    "magnetic polish": ["cat-eye"],
    "cat eye nails": ["cat-eye"],
    "glitter": ["glitter"],
    "sparkle": ["glitter"],
    "shiny": ["glitter"],
    "glitter nails": ["glitter"],
    "sparkly": ["glitter"],
    "pastel": ["pastel"],
    "pink": ["pastel"],
    "blue": ["pastel"],
    "purple": ["pastel"],
    "soft": ["pastel"],
    "pastel nails": ["pastel"],
    "light pink": ["pastel"],
    "light blue": ["pastel"],
    "lavender": ["pastel"],
};

const TAG_SET = new Set<string>(TAGS as ReadonlyArray<string>);

// Ключевые слова, которые указывают на нерелевантные изображения
const EXCLUDE_KEYWORDS = [
    // Цветы и растения
    "flower",
    "flowers",
    "bloom",
    "blossom",
    "petal",
    "rose",
    "tulip",
    "plant",
    "plants",
    "garden",
    "nature",
    "bouquet",
    "floral",
    "botanical",
    // Животные
    "cat",
    "cats",
    "kitten",
    "kittens",
    "dog",
    "dogs",
    "puppy",
    "animal",
    "animals",
    "pet",
    "pets",
    // Люди в полный рост
    "full body",
    "full-body",
    "person standing",
    "woman standing",
    "man standing",
    "portrait full",
    "full length",
    "full-length",
    "body shot",
    "full figure",
    // Другие нерелевантные объекты
    "landscape",
    "scenery",
    "building",
    "architecture",
];

export function isRelevantPhoto(photo: PexelsPhoto): boolean {
    const text = `${photo.alt || ""} ${photo.photographer || ""}`.toLowerCase();
    
    // Проверяем, нет ли в описании ключевых слов, указывающих на нерелевантные изображения
    for (const keyword of EXCLUDE_KEYWORDS) {
        if (text.includes(keyword)) {
            return false;
        }
    }
    
    // Проверяем, что в описании есть слова, связанные с ногтями
    const nailKeywords = ["nail", "manicure", "polish", "finger", "hand"];
    const hasNailKeyword = nailKeywords.some(keyword => text.includes(keyword));
    
    // Дополнительная проверка: если есть слова, указывающие на людей в полный рост
    const fullBodyIndicators = ["standing", "walking", "sitting", "full body", "full-body"];
    const hasFullBodyIndicator = fullBodyIndicators.some(indicator => text.includes(indicator));
    if (hasFullBodyIndicator && !text.includes("hand") && !text.includes("finger") && !text.includes("nail")) {
        return false;
    }
    
    return hasNailKeyword;
}

export function mapPexelsTags(photo: PexelsPhoto, forcedTag?: Tag): Tag[] {
    const picked = new Set<Tag>();
    
    // Если передан forcedTag, используем его
    if (forcedTag && TAG_SET.has(forcedTag)) {
        picked.add(forcedTag);
    }
    
    const text = `${photo.alt || ""} ${photo.photographer || ""}`.toLowerCase();

    // Ищем ключевые слова
    for (const [keyword, tags] of Object.entries(TAG_KEYWORDS)) {
        if (text.includes(keyword)) {
            tags.forEach(tag => {
                if (TAG_SET.has(tag)) {
                    picked.add(tag);
                }
            });
        }
    }

    // Если не нашли теги и не был передан forcedTag, добавляем случайные популярные теги на основе ID фото
    // Это гарантирует, что у каждого дизайна будет хотя бы один тег
    if (picked.size === 0 && !forcedTag) {
        const popularTags: Tag[] = ["french", "nude", "red", "glitter", "pastel", "ombre", "black", "white"];
        const randomTag = popularTags[photo.id % popularTags.length];
        picked.add(randomTag);
    }

    return Array.from(picked).slice(0, 3);
}

