import { NextResponse } from "next/server";
import { db } from "@/db";
import { proProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await db.select().from(proProfiles).where(eq(proProfiles.userId, session.user.id));

    if (!profile.length) {
        return NextResponse.json({ data: null });
    }

    return NextResponse.json({ data: profile[0] });
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "pro") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { bio, instagram, minPricePln } = body;

    // Проверить, существует ли профиль
    const existing = await db
        .select()
        .from(proProfiles)
        .where(eq(proProfiles.userId, session.user.id));

    let result;
    if (existing.length) {
        // UPDATE
        result = await db
            .update(proProfiles)
            .set({
                bio: bio || null,
                instagram: instagram || null,
                minPricePln: minPricePln || null,
            })
            .where(eq(proProfiles.userId, session.user.id))
            .returning();
    } else {
        // INSERT
        result = await db
            .insert(proProfiles)
            .values({
                userId: session.user.id,
                bio: bio || null,
                instagram: instagram || null,
                minPricePln: minPricePln || null,
            })
            .returning();
    }

    return NextResponse.json({ data: result[0] });
}
