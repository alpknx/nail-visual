import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { designCatalog } from "@/db/schema";
import { and, desc, sql, or, eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tags = searchParams.get("tags")?.split(",").filter(Boolean) || [];
    const limit = Math.min(Number(searchParams.get("limit") || 50), 200);
    const offset = Number(searchParams.get("offset") || 0);

    let where: any = undefined;

    // Фильтрация по тегам: ищем дизайны, у которых есть хотя бы один из указанных тегов
    if (tags.length > 0) {
      // Используем оператор && для проверки пересечения массивов
      // Создаем PostgreSQL массив из тегов
      // Формат: ARRAY['tag1', 'tag2']::text[]
      const tagsArraySql = sql`ARRAY[${sql.join(tags.map(tag => sql`${tag}`), sql`, `)}]::text[]`;
      where = sql`${designCatalog.tags} && ${tagsArraySql}`;
    }

    // Используем группировку для исключения дубликатов по sourceId
    // Берем только уникальные sourceId, выбирая самую новую запись для каждого
    const designs = await db
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
      .where(where)
      .orderBy(desc(designCatalog.createdAt))
      .limit(limit * 2) // Берем больше, чтобы после фильтрации осталось достаточно
      .offset(offset);

    // Фильтруем дубликаты по sourceId и по id на стороне приложения
    const seenSourceIds = new Set<string | null>();
    const seenIds = new Set<string>();
    const uniqueDesigns = designs.filter(design => {
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

    const response = NextResponse.json({ data: uniqueDesigns });
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=86400"
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

