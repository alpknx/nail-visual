import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, works } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(
    _req: NextRequest,
    ctx: { params: Promise<{ id: string }> } // <- params как Promise
) {
    const { id } = await ctx.params;

    // базовая инфа о пользователе
    const u = await db.query.users.findFirst({
        where: (t, { eq }) => eq(t.id, id),
        columns: {
            id: true,
            name: true,
            email: true,
            image: true,
            city: true,
            role: true,
        },
    });

    if (!u) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    // профиль pro (если есть)
    const prof = await db.query.proProfiles.findFirst({
        where: (t, { eq }) => eq(t.userId, id),
        columns: {
            instagram: true,
            bio: true,
            minPricePln: true,
            isVerified: true,
        },
    });

    // агрегаты по работам
    const agg = await db
        .select({
            worksCount: sql<number>`COUNT(${works.id})`,
            sampleUrl: sql<string | null>`
        (
          SELECT ${works.imageUrl}
          FROM ${works}
          WHERE ${works.proId} = ${id}
          ORDER BY ${works.createdAt} DESC
          LIMIT 1
        )
      `,
            lastWorkAt: sql<Date | null>`MAX(${works.createdAt})`,
            cities: sql<string[]>`
        COALESCE(
          ARRAY(
            SELECT DISTINCT ${works.city}
            FROM ${works}
            WHERE ${works.proId} = ${id} AND ${works.city} IS NOT NULL
          ),
          '{}'
        )
      `,
            tags: sql<string[]>`
        COALESCE(
          ARRAY(
            SELECT DISTINCT t
            FROM ${works} w2, LATERAL UNNEST(w2.tags) AS t
            WHERE w2.pro_id = ${id} AND t IS NOT NULL
          ),
          '{}'
        )
      `,
        })
        .from(users)
        .where(eq(users.id, id));

    const a = agg[0] ?? {
        worksCount: 0,
        sampleUrl: null,
        lastWorkAt: null,
        cities: [],
        tags: [],
    };

    return NextResponse.json({
        data: {
            id: u.id,
            name: u.name ?? null,
            email: u.email ?? null,
            image: u.image ?? null,
            city: u.city ?? null,
            instagram: prof?.instagram ?? null,
            minPricePln: prof?.minPricePln ?? null,
            isVerified: prof?.isVerified ?? false,
            worksCount: Number(a.worksCount ?? 0),
            sampleUrl: a.sampleUrl,
            lastWorkAt: a.lastWorkAt ? new Date(a.lastWorkAt).toISOString() : null,
            cities: a.cities ?? [],
            tags: a.tags ?? [],
        },
    });
}
