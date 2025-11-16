import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { designCatalog, proWorks } from "@/db/schema";
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

    const response = NextResponse.json({
      data: matchingPros,
      count: matchingPros.length,
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

