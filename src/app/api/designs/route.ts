import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { designCatalog } from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { searchPexelsPhotos, mapPexelsTags, pickBestPexelsPhotoUrl, isRelevantPhoto } from "@/lib/pexels";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") || 50);
    const offset = Number(searchParams.get("offset") || 0);

    // Сначала пытаемся получить дизайны из БД
    const query = db
      .select({
        id: designCatalog.id,
        imageUrl: designCatalog.imageUrl,
        description: designCatalog.description,
        tags: designCatalog.tags,
        source: designCatalog.source,
        sourceId: designCatalog.sourceId,
        createdAt: designCatalog.createdAt,
      })
      .from(designCatalog)
      .orderBy(desc(designCatalog.createdAt))
      .limit(limit * 2) // Берем больше, чтобы после фильтрации осталось достаточно
      .offset(offset);

    let designs = await query;

    // Фильтруем дубликаты по sourceId и по id на стороне приложения
    const seenSourceIds = new Set<string | null>();
    const seenIds = new Set<string>();
    let uniqueDesigns = designs.filter(design => {
      // Проверяем дубликаты по ID (основной ключ)
      if (seenIds.has(design.id)) return false;
      seenIds.add(design.id);
      
      // Проверяем дубликаты по sourceId
      if (design.sourceId) {
        if (seenSourceIds.has(design.sourceId)) return false;
        seenSourceIds.add(design.sourceId);
      }
      
      return true;
    }).slice(0, limit); // Берем только нужное количество

    // Если в БД недостаточно дизайнов, загружаем из Pexels
    if (uniqueDesigns.length < limit) {
      const needed = limit - uniqueDesigns.length;
      const pexelsPage = Math.floor(offset / 80) + 1; // Pexels возвращает до 80 фото за запрос
      
      try {
        const photos = await searchPexelsPhotos({
          query: "nail",
          perPage: 80,
          page: pexelsPage,
          orientation: "portrait",
        });

        // Получаем существующие sourceId из БД, чтобы не дублировать
        const existingSourceIds = await db
          .select({ sourceId: designCatalog.sourceId })
          .from(designCatalog)
          .where(eq(designCatalog.source, "pexels"));
        
        const existingIdsSet = new Set(
          existingSourceIds
            .map(r => r.sourceId)
            .filter((id): id is string => id !== null)
        );

        const newDesigns = [];
        for (const photo of photos) {
          if (newDesigns.length >= needed) break;

          // Пропускаем дубликаты
          if (existingIdsSet.has(String(photo.id))) continue;
          if (seenSourceIds.has(String(photo.id))) continue;

          // Фильтруем нерелевантные фото
          if (!isRelevantPhoto(photo)) continue;

          const imageUrl = pickBestPexelsPhotoUrl(photo);
          if (!imageUrl) continue;

          // Маппим теги автоматически
          const tags = mapPexelsTags(photo);
          if (tags.length === 0) continue;

          newDesigns.push({
            imageUrl,
            description: photo.alt || null,
            tags,
            source: "pexels",
            sourceId: String(photo.id),
          });

          seenSourceIds.add(String(photo.id));
        }

        // Сохраняем новые дизайны в БД (если есть что сохранять)
        if (newDesigns.length > 0) {
          try {
            const inserted = await db.insert(designCatalog).values(newDesigns).returning({
              id: designCatalog.id,
              sourceId: designCatalog.sourceId,
            });
            
            // Получаем полные данные вставленных дизайнов
            const insertedSourceIds = inserted.map(r => r.sourceId).filter((id): id is string => id !== null);
            if (insertedSourceIds.length > 0) {
              const insertedDesigns = await db
                .select({
                  id: designCatalog.id,
                  imageUrl: designCatalog.imageUrl,
                  description: designCatalog.description,
                  tags: designCatalog.tags,
                  source: designCatalog.source,
                  sourceId: designCatalog.sourceId,
                  createdAt: designCatalog.createdAt,
                })
                .from(designCatalog)
                .where(inArray(designCatalog.sourceId, insertedSourceIds));
              
              // Добавляем новые дизайны к результату
              uniqueDesigns = [...uniqueDesigns, ...insertedDesigns].slice(0, limit);
            }
          } catch (insertError: any) {
            // Игнорируем ошибки дубликатов при вставке
            if (!insertError.message?.includes("duplicate") && !insertError.code?.includes("23505")) {
              console.error("Error inserting designs:", insertError);
            }
          }
        }
      } catch (pexelsError: any) {
        console.error("Error fetching from Pexels:", pexelsError);
        // Продолжаем с тем, что есть в БД
      }
    }

    const response = NextResponse.json({ data: uniqueDesigns });
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=600"
    );
    
    return response;
  } catch (error: any) {
    console.error("Error fetching designs:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch designs" },
      { status: 500 }
    );
  }
}

