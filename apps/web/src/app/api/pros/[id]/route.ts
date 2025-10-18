import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, proProfiles, works } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
    _req: Request,
    { params }: { params: { id: string } }
) {
    const proId = params.id;

    // один селект с агрегатами по works
    const rows = await db
        .select({
            id: users.id,
            name: users.name,
            email: users.email,
            image: users.image,
            city: users.city,
            instagram: proProfiles.instagram,
            minPricePln: proProfiles.minPricePln,
            isVerified: proProfiles.isVerified,

            worksCount: sql<number>`(
        SELECT COUNT(*) FROM ${works} w2 WHERE w2.pro_id = ${users.id}
      )`,

            sampleUrl: sql<string | null>`(
        SELECT w2.image_url FROM ${works} w2
        WHERE w2.pro_id = ${users.id}
        ORDER BY w2.created_at DESC
        LIMIT 1
      )`,

            lastWorkAt: sql<Date | null>`(
        SELECT MAX(w2.created_at) FROM ${works} w2
        WHERE w2.pro_id = ${users.id}
      )`,

            cities: sql<string[] | null>`
        COALESCE(
          ARRAY(
            SELECT DISTINCT w2.city
            FROM ${works} w2
            WHERE w2.pro_id = ${users.id} AND w2.city IS NOT NULL
          ),
          '{}'::text[]
        )
      `,

            tags: sql<string[] | null>`
        COALESCE(
          ARRAY(
            SELECT DISTINCT t
            FROM ${works} w2, LATERAL UNNEST(w2.tags) AS t
            WHERE w2.pro_id = ${users.id} AND t IS NOT NULL
          ),
          '{}'::text[]
        )
      `,
        })
        .from(users)
        .leftJoin(proProfiles, eq(proProfiles.userId, users.id))
        .where(and(eq(users.id, proId), eq(users.role, "pro")) as any)
        .limit(1);

    if (!rows.length) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const r = rows[0];
    return NextResponse.json({
        data: {
            id: r.id,
            name: r.name,
            email: r.email,
            image: r.image,
            city: r.city,
            instagram: r.instagram,
            minPricePln: r.minPricePln,
            isVerified: !!r.isVerified,
            worksCount: Number(r.worksCount ?? 0),
            sampleUrl: r.sampleUrl ?? null,
            lastWorkAt: r.lastWorkAt ? new Date(r.lastWorkAt).toISOString() : null,
            cities: Array.isArray(r.cities) ? r.cities.filter(Boolean) : [],
            tags: Array.isArray(r.tags) ? r.tags.filter(Boolean) : [],
        },
    });
}
