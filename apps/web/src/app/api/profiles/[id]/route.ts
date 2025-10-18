import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { proProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProProfilePatch = {
    bio?: string | null;
    instagram?: string | null;
    minPricePln?: number | null;
    city?: string | null;
};

export async function GET(
    _req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id: userId } = await context.params;

    const rows = await db
        .select()
        .from(proProfiles)
        .where(eq(proProfiles.userId, userId))
        .limit(1);

    return NextResponse.json({ data: rows[0] ?? null });
}

export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id: userId } = await context.params;

    const body = (await req.json().catch(() => ({}))) as ProProfilePatch;

    const update: ProProfilePatch = {};
    if ("bio" in body) update.bio = body.bio ?? null;
    if ("instagram" in body) update.instagram = body.instagram ?? null;
    if ("minPricePln" in body) update.minPricePln = body.minPricePln ?? null;
    if ("city" in body) update.city = body.city ?? null;

    const inserted = await db
        .insert(proProfiles)
        .values({ userId, ...update })
        .onConflictDoUpdate({
            target: proProfiles.userId,
            set: update,
        })
        .returning();

    return NextResponse.json({ data: inserted[0] });
}
