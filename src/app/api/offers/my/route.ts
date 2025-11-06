import { NextResponse } from "next/server";
import { db } from "@/db";
import { offers } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Получить все офферы текущего мастера
    const rows = await db
        .select()
        .from(offers)
        .where(eq(offers.proId, session.user.id))
        .orderBy(desc(offers.createdAt));

    return NextResponse.json({ data: rows });
}
