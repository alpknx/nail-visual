import { NextResponse } from "next/server";
import { db } from "@/db";
import { clientReferences } from "@/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";
import { authOptions } from "../auth/[...nextauth]/route";
import { getServerSession } from "next-auth";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const ids = searchParams.getAll("id");
    if (ids.length) {
        const rows = await db.select().from(clientReferences).where(inArray(clientReferences.id, ids as any));
        return NextResponse.json({ data: rows });
    }
    const city = searchParams.get("city") ?? undefined;
    const where = city ? eq(clientReferences.city, city) : undefined;
    const rows = await db.select().from(clientReferences).where(where as any).orderBy(desc(clientReferences.createdAt));
    return NextResponse.json({ data: rows });
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "client") {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const row = await db.insert(clientReferences).values({
        clientId: session.user.id,
        imageUrl: body.imageUrl,
        city: body.city,
        tags: body.tags,
        note: body.note ?? null,
    }).returning();

    return NextResponse.json(row[0], { status: 201 });
}
