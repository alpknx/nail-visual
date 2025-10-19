import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { offers, clientReferences } from "@/db/schema";
import { eq } from "drizzle-orm";

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
                .where(eq(offers.id, id as any))
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
            .where(eq(offers.id, id as any))
            .returning();

        if (!updated.length) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        return NextResponse.json(updated[0]);
    }

    return NextResponse.json({ error: "Bad status" }, { status: 400 });
}
