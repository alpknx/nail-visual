import { NextResponse } from "next/server";
import { db } from "@/db";
import { proWorks } from "@/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const city = searchParams.get("city");
    const proId = searchParams.get("proId");
    const tag = searchParams.get("tag");
    const limit = Number(searchParams.get("limit") || 50);

    const where = and(
        city ? eq(proWorks.city, city) : undefined,
        proId ? eq(proWorks.proId, proId) : undefined,
        // простая фильтрация по тегу (если теги text[])
        tag ? sql<boolean>`${proWorks.tags}::text ILIKE ${`%${tag}%`}` : undefined,
    );

    const rows = await db
        .select()
        .from(proWorks)
        .where(where)
        .orderBy(desc(proWorks.createdAt))
        .limit(limit);

    return NextResponse.json({ data: rows });
}
