import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { offers, clientReferences } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function PATCH(
    req: NextRequest,
    ctx: { params: Promise<{ id: string }> } // <- важно: params как Promise
) {
    const { id } = await ctx.params;

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
    }

    const status = (body as { status?: string })?.status;

    if (status === "accepted") {
        const result = await db.transaction(async (tx) => {
            const updated = await tx
                .update(offers)
                .set({
                    status: "accepted",
                    acceptedAt: new Date(),
                })
                .where(eq(offers.id, id))
                .returning();

            if (!updated.length) return null;

            const off = updated[0];
            await tx
                .update(clientReferences)
                .set({ status: "matched" })
                .where(eq(clientReferences.id, off.refId));

            return off;
        });

        if (!result) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        return NextResponse.json(result);
    }

    if (status === "declined") {
        const updated = await db
            .update(offers)
            .set({ status: "declined" })
            .where(eq(offers.id, id))
            .returning();

        if (!updated.length) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        return NextResponse.json(updated[0]);
    }

    return NextResponse.json({ error: "Bad status" }, { status: 400 });
}

export async function DELETE(
    _req: NextRequest,
    ctx: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;

    // Проверить, что это собственный оффер мастера
    const offer = await db
        .select()
        .from(offers)
        .where(eq(offers.id, id));

    if (!offer.length) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (offer[0].proId !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Удалить оффер
    await db.delete(offers).where(eq(offers.id, id));

    return NextResponse.json({ success: true });
}
