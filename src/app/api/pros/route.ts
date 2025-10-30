import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProSummary = {
    proId: string;
    worksCount: number;
    sampleUrl: string | null;
    cities: string[];
    tags: string[];
};

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const city = searchParams.get("city");           // может быть null
        const limit = Number(searchParams.get("limit") || 50);

        // Сырой параметризованный SQL: всё явно квалифицировано как "u"."id"
        const rows = await db.execute(sql/*sql*/`
      SELECT
        u.id                                AS pro_id,
        (
          SELECT COUNT(*) FROM pro_works w2
          WHERE w2.pro_id = u.id
        )                                   AS works_count,
        (
          SELECT w2.image_url
          FROM pro_works w2
          WHERE w2.pro_id = u.id
          ORDER BY w2.created_at DESC
          LIMIT 1
        )                                   AS sample_url,
        COALESCE(
          ARRAY(
            SELECT DISTINCT w2.city
            FROM pro_works w2
            WHERE w2.pro_id = u.id AND w2.city IS NOT NULL
          ),
          '{}'::text[]
        )                                   AS cities,
        COALESCE(
          ARRAY(
            SELECT DISTINCT t
            FROM pro_works w2, LATERAL UNNEST(w2.tags) AS t
            WHERE w2.pro_id = u.id AND t IS NOT NULL
          ),
          '{}'::text[]
        )                                   AS tags,
        (
          SELECT MAX(w2.created_at)
          FROM pro_works w2
          WHERE w2.pro_id = u.id
        )                                   AS last_work_at
      FROM users u
      WHERE u.role = 'pro'
        AND (
          ${city ?? null}::text IS NULL
          OR EXISTS (
              SELECT 1 FROM pro_works wx
              WHERE wx.pro_id = u.id AND wx.city = ${city ?? null}
          )
        )
      ORDER BY last_work_at DESC NULLS LAST
      LIMIT ${limit}
    `);

        // Приводим к нужному формату
        const pros: ProSummary[] = (rows as Array<Record<string, unknown>>).map((r) => ({
            proId: String(r.pro_id ?? ""),
            worksCount: Number(r.works_count ?? 0),
            sampleUrl: (r.sample_url as string | null) ?? null,
            cities: Array.isArray(r.cities) ? r.cities.filter(Boolean) : [],
            tags: Array.isArray(r.tags) ? r.tags.filter(Boolean) : [],
        }));

        return NextResponse.json({ data: pros });
    } catch (e: unknown) {
        const error = e instanceof Error ? e : new Error(String(e));
        return NextResponse.json(
            { error: "pros_failed", message: error.message },
            { status: 500 }
        );
    }
}
