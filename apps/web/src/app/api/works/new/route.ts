import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { db } from "@/db";
import { works } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if ((session as any).role !== "pro") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl : null;
    const caption  = typeof body.caption === "string" ? body.caption : null;
    const city     = typeof body.city === "string" ? body.city : null;
    const tags     = Array.isArray(body.tags) ? body.tags as string[] : [];

    if (!imageUrl) {
        return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
    }

    const inserted = await db.insert(works).values({
        proId: session.user.id,
        imageUrl,
        caption,
        city,
        tags,
    }).returning();

    return NextResponse.json({ data: inserted[0] }, { status: 201 });
}
