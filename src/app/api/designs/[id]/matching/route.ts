import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { designCatalog, proWorks, users, proProfiles } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const city = searchParams.get("city");

    // Проверяем, что дизайн существует
    const design = await db
      .select({
        id: designCatalog.id,
      })
      .from(designCatalog)
      .where(eq(designCatalog.id, id))
      .limit(1);

    if (!design.length) {
      return NextResponse.json({ data: [], count: 0 });
    }

    // Если город не указан, возвращаем пустой результат
    if (!city) {
      return NextResponse.json({ data: [], count: 0 });
    }

    // Ищем мастеров только по городу, без учета тегов
    const normalizedCity = city.trim().toLowerCase();
    const where = sql`LOWER(TRIM(${proWorks.city})) = ${normalizedCity}`;

    // Получаем уникальных мастеров (по proId) с подсчетом количества работ в этом городе
    const matchingPros = await db
      .select({
        proId: proWorks.proId,
        matchingWorksCount: sql<number>`COUNT(*)::int`,
      })
      .from(proWorks)
      .where(where)
      .groupBy(proWorks.proId)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(20);

    // Загружаем полную информацию о мастерах
    const proIds = matchingPros.map(p => p.proId);
    if (proIds.length === 0) {
      return NextResponse.json({ data: [], count: 0 });
    }

    // Получаем превью работ для каждого мастера (последняя работа каждого мастера)
    const sampleWorksRaw = await db.execute(sql`
      SELECT DISTINCT ON (pro_id) 
        pro_id as "proId",
        image_url as "sampleUrl"
      FROM ${proWorks}
      WHERE pro_id = ANY(${proIds}::text[])
      ORDER BY pro_id, created_at DESC
    `);
    
    const sampleWorks = (Array.isArray(sampleWorksRaw) ? sampleWorksRaw : []).map((row: any) => ({
      proId: row.proId,
      sampleUrl: row.sampleUrl,
    }));

    const prosWithProfiles = await db
      .select({
        id: users.id,
        name: users.name,
        image: users.image,
        phone: users.phone,
        city: users.city,
        bio: proProfiles.bio,
        instagram: proProfiles.instagram,
        minPricePln: proProfiles.minPricePln,
        isVerified: proProfiles.isVerified,
      })
      .from(users)
      .leftJoin(proProfiles, eq(users.id, proProfiles.userId))
      .where(sql`${users.id} = ANY(${proIds}::text[])`);

    // Объединяем данные
    const result = prosWithProfiles.map(pro => {
      const matching = matchingPros.find(m => m.proId === pro.id);
      const sample = sampleWorks.find(s => s.proId === pro.id);
      return {
        ...pro,
        matchingWorksCount: matching?.matchingWorksCount || 0,
        sampleUrl: sample?.sampleUrl || null,
      };
    }).sort((a, b) => b.matchingWorksCount - a.matchingWorksCount);

    const response = NextResponse.json({
      data: result,
      count: result.length,
    });
    
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=600"
    );
    
    return response;
  } catch (error: any) {
    console.error("Error fetching matching pros:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch matching pros" },
      { status: 500 }
    );
  }
}

