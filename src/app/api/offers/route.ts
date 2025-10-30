import { NextResponse } from "next/server";
import { db } from "@/db";
import { offers, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import {getServerSession} from "next-auth";
import {authOptions} from "@/app/api/auth/[...nextauth]/route";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const refId = searchParams.get("referenceId");
    if (!refId) return NextResponse.json({ data: [] });

    const rows = await db.select({
        id: offers.id,
        refId: offers.refId,
        proId: offers.proId,
        message: offers.message,
        pricePln: offers.pricePln,
        status: offers.status,
        createdAt: offers.createdAt,
        pro: {
            id: users.id,
            name: users.name,
            image: users.image,
            phone: users.phone,
        },
    })
        .from(offers)
        .leftJoin(users, eq(offers.proId, users.id))
        .where(eq(offers.refId, refId))
        .orderBy(desc(offers.createdAt));
    
    const response = NextResponse.json({ data: rows });
    
    // Кэшировать офферы на 2 минуты (часто меняются)
    response.headers.set(
        "Cache-Control",
        "public, s-maxage=120, stale-while-revalidate=600"
    );
    
    return response;
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "pro") {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }

    const body = await req.json(); // { refId, proId, message?, pricePln? }
    const row = await db.insert(offers).values({
        refId: body.refId,
        proId: session.user.id, // ⬅️ больше не хардкодим
        message: body.message ?? null,
        pricePln: body.pricePln ?? null,
    }).returning();
    return NextResponse.json(row[0], { status: 201 });
}
