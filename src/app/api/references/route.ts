import { NextResponse } from "next/server";
import { db } from "@/db";
import { clientReferences } from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const ids = searchParams.getAll("id");
    
    if (ids.length) {
        const rows = await db.select({
            id: clientReferences.id,
            clientId: clientReferences.clientId,
            imageUrl: clientReferences.imageUrl,
            note: clientReferences.note,
            tags: clientReferences.tags,
            city: clientReferences.city,
            status: clientReferences.status,
            createdAt: clientReferences.createdAt,
        }).from(clientReferences).where(inArray(clientReferences.id, ids));
        return NextResponse.json({ data: rows });
    }
    
    const city = searchParams.get("city") ?? undefined;
    const limit = Math.min(Number(searchParams.get("limit") || 50), 100);
    const offset = Number(searchParams.get("offset") || 0);
    
    const where = city ? eq(clientReferences.city, city) : undefined;
    const rows = await db
        .select({
            id: clientReferences.id,
            clientId: clientReferences.clientId,
            imageUrl: clientReferences.imageUrl,
            note: clientReferences.note,
            tags: clientReferences.tags,
            city: clientReferences.city,
            status: clientReferences.status,
            createdAt: clientReferences.createdAt,
        })
        .from(clientReferences)
        .where(where)
        .orderBy(desc(clientReferences.createdAt))
        .limit(limit)
        .offset(offset);
    
    const response = NextResponse.json({ data: rows });
    
    // Кэшировать открытые референсы на 10 минут
    response.headers.set(
        "Cache-Control",
        "public, s-maxage=600, stale-while-revalidate=3600"
    );
    
    return response;
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
