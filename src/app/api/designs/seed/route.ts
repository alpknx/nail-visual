import { NextResponse } from "next/server";
import { db } from "@/db";
import { designCatalog } from "@/db/schema";
import { searchPexelsPhotos, mapPexelsTags, pickBestPexelsPhotoUrl, isRelevantPhoto } from "@/lib/pexels";

/**
 * Endpoint для заполнения каталога дизайнов из Pexels
 * Можно вызвать один раз для seed данных
 * POST /api/designs/seed
 */
export async function POST(req: Request) {
  try {
    // Проверяем, есть ли уже дизайны
    const existing = await db.select().from(designCatalog).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ 
        message: "Design catalog already has data",
        count: existing.length 
      });
    }

    const allDesigns = [];
    const targetCount = 200; // Общее количество дизайнов
    const seenSourceIds = new Set<string>(); // Для исключения дубликатов
    const query = "nail"; // Единый запрос для всех дизайнов

    // Загружаем фото батчами, пока не наберем нужное количество
    let page = 1;
    let totalFetched = 0;

    while (totalFetched < targetCount) {
      try {
        const photos = await searchPexelsPhotos({
          query,
          perPage: 80,
          page,
          orientation: "portrait",
        });

        if (photos.length === 0) {
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

        // Небольшая задержка, чтобы не превысить rate limits Pexels
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Если получили меньше фото, чем запросили, значит больше нет
        if (photos.length < 80) {
          break;
        }
        
        page++;
      } catch (error) {
        console.error(`Error fetching photos (page ${page}):`, error);
        break;
      }
    }

    if (allDesigns.length === 0) {
      return NextResponse.json({ error: "No designs to insert" }, { status: 400 });
    }

    // Вставляем дизайны батчами по 50
    const batchSize = 50;
    let inserted = 0;
    for (let i = 0; i < allDesigns.length; i += batchSize) {
      const batch = allDesigns.slice(i, i + batchSize);
      await db.insert(designCatalog).values(batch);
      inserted += batch.length;
    }

    return NextResponse.json({ 
      success: true,
      inserted,
      total: allDesigns.length
    });
  } catch (error: any) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to seed designs" },
      { status: 500 }
    );
  }
}

