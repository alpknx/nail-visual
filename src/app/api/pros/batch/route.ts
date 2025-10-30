import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, proProfiles } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const ids = searchParams.get("ids")?.split(",") || [];

    if (ids.length === 0) {
        return NextResponse.json({ data: [] });
    }

    // Загружаем мастеров и их профили batch'ем
    const rows = await db
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
        .where(inArray(users.id, ids));

    const response = NextResponse.json({ data: rows });

    // Кэшировать профили на 10 минут
    response.headers.set(
        "Cache-Control",
        "public, s-maxage=600, stale-while-revalidate=3600"
    );

    return response;
}
