import { NextResponse } from "next/server";
import { db } from "@/db";
import { offers } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import {getServerSession} from "next-auth";
import {authOptions} from "@/app/api/auth/[...nextauth]/route";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const refId = searchParams.get("referenceId");
    if (!refId) return NextResponse.json({ data: [] });

    const rows = await db.select().from(offers)
        .where(eq(offers.refId, refId as any))
        .orderBy(desc(offers.createdAt));
    return NextResponse.json({ data: rows });
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || (session as any).role !== "pro") {
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
