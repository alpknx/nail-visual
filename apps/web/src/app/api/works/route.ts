import { NextResponse } from "next/server";
import { db } from "@/db";
import { works } from "@/db/schema";
import { and, desc, eq, ilike, sql } from "drizzle-orm";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const city = searchParams.get("city");
    const proId = searchParams.get("proId");
    const tag = searchParams.get("tag");
    const limit = Number(searchParams.get("limit") || 50);

    const where = and(
        city ? eq(works.city, city) : undefined,
        proId ? eq(works.proId, proId) : undefined,
        // простая фильтрация по тегу (если теги text[])
        tag ? sql<boolean>`${works.tags}::text ILIKE ${`%${tag}%`}` : undefined,
    );

    const rows = await db
        .select()
        .from(works)
        .where(where as any)
        .orderBy(desc(works.createdAt))
        .limit(limit);

    return NextResponse.json({ data: rows });
}
