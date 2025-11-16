import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { designCatalog } from "./schema";
import { searchPexelsPhotos, mapPexelsTags, pickBestPexelsPhotoUrl, isRelevantPhoto } from "../lib/pexels";

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
}

// Pexels API key можно задать через переменную окружения или использовать дефолтный
const PEXELS_API_KEY = process.env.PEXELS_API_KEY || "TiDKMoIvWVBEWGFzHO0vyeo1mf6WHZBamlL2ADsLXc1wJkAGHp9OI5te";

const client = postgres(process.env.DATABASE_URL, {
    prepare: false,
    max: 1,
});
const db = drizzle(client);

async function seedDesigns() {
    console.log("🌱 Starting design catalog seed...");
    
    // Проверяем, есть ли уже дизайны
    const existing = await db.select().from(designCatalog).limit(1);
    if (existing.length > 0) {
        console.log("⚠️  Design catalog already has data. Skipping seed.");
        return;
    }

    const allDesigns = [];
    const targetCount = 200; // Общее количество дизайнов
    const seenSourceIds = new Set<string>(); // Для исключения дубликатов
    const query = "nail"; // Единый запрос для всех дизайнов

    console.log(`\n📋 Loading designs with query: "${query}"...`);

    try {
        // Загружаем фото батчами, пока не наберем нужное количество
        let page = 1;
        let totalFetched = 0;

        while (totalFetched < targetCount) {
            console.log(`  📸 Fetching page ${page}...`);
            
            const photos = await searchPexelsPhotos({
                query,
                perPage: 80,
                page,
                orientation: "portrait",
            });

            if (photos.length === 0) {
                console.log("  ⚠️  No more photos available");
                break;
            }

            for (const photo of photos) {
                if (totalFetched >= targetCount) break;

                // Пропускаем дубликаты
                if (seenSourceIds.has(String(photo.id))) continue;

                // Фильтруем нерелевантные фото
                if (!isRelevantPhoto(photo)) continue;

                const imageUrl = pickBestPexelsPhotoUrl(photo);
                if (!imageUrl) continue;

                // Маппим теги автоматически (без forcedTag)
                const tags = mapPexelsTags(photo);
                if (tags.length === 0) continue;

                allDesigns.push({
                    imageUrl,
                    description: photo.alt || null,
                    tags,
                    source: "pexels",
                    sourceId: String(photo.id),
                });

                seenSourceIds.add(String(photo.id));
                totalFetched++;
            }

            console.log(`  ✅ Fetched ${totalFetched} designs so far (page ${page})`);
            
            // Небольшая задержка, чтобы не превысить rate limits Pexels
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Если получили меньше фото, чем запросили, значит больше нет
            if (photos.length < 80) {
                break;
            }
            
            page++;
        }

        console.log(`✅ Total designs fetched: ${totalFetched}`);
    } catch (error) {
        console.error(`  ❌ Error fetching photos:`, error);
    }

    if (allDesigns.length === 0) {
        console.log("⚠️  No designs to insert.");
        return;
    }

    // Вставляем дизайны батчами по 50
    const batchSize = 50;
    for (let i = 0; i < allDesigns.length; i += batchSize) {
        const batch = allDesigns.slice(i, i + batchSize);
        await db.insert(designCatalog).values(batch);
        console.log(`💾 Inserted batch ${Math.floor(i / batchSize) + 1} (${batch.length} designs)`);
    }

    console.log(`\n✅ Successfully seeded ${allDesigns.length} designs!`);
}

seedDesigns()
    .catch((e) => {
        console.error("❌ Seed failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await client.end();
    });

