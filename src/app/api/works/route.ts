import { NextResponse } from "next/server";
import { db } from "@/db";
import { proWorks } from "@/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const city = searchParams.get("city");
    const proId = searchParams.get("proId");
    const tag = searchParams.get("tag");
    const limit = Math.min(Number(searchParams.get("limit") || 50), 100);
    const offset = Number(searchParams.get("offset") || 0);

    const where = and(
        city ? eq(proWorks.city, city) : undefined,
        proId ? eq(proWorks.proId, proId) : undefined,
        tag ? sql<boolean>`${proWorks.tags}::text ILIKE ${`%${tag}%`}` : undefined,
    );

    const rows = await db
        .select({
            id: proWorks.id,
            proId: proWorks.proId,
            imageUrl: proWorks.imageUrl,
            caption: proWorks.caption,
            tags: proWorks.tags,
            city: proWorks.city,
            createdAt: proWorks.createdAt,
        })
        .from(proWorks)
        .where(where)
        .orderBy(desc(proWorks.createdAt))
        .limit(limit)
        .offset(offset);

    const response = NextResponse.json({ data: rows });
    
    // Кэшировать на 5 минут (для списков, которые меняются редко)
    response.headers.set(
        "Cache-Control",
        "public, s-maxage=300, stale-while-revalidate=3600"
    );
    
    return response;
}
