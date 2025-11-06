import { NextResponse } from "next/server";
import { db } from "@/db";
import { clientReferences, offers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
    _req: Request,
    ctx: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    const { id } = await ctx.params;
    
    const ref = await db
        .select()
        .from(clientReferences)
        .where(eq(clientReferences.id, id));
    
    if (!ref.length) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const refData = ref[0];
    
    // Если статус matched, проверить что текущий пользователь — либо собственник, либо имеет accepted оффер
    if (refData.status === "matched" && session?.user?.id) {
        const userOffers = await db
            .select()
            .from(offers)
            .where(
                eq(offers.refId, id)
            );
        
        const hasAcceptedOffer = userOffers.some(
            o => o.proId === session.user.id && o.status === "accepted"
        );
        
        const isOwner = refData.clientId === session.user.id;
        
        if (!isOwner && !hasAcceptedOffer) {
            // Скрыть matched reference от других
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
    }
    
    return NextResponse.json({
        ...refData,
        clientId: refData.clientId,
    });
}

export async function DELETE(
    _req: Request,
    ctx: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;

    // Проверить, что это собственный референс клиента
    const ref = await db
        .select()
        .from(clientReferences)
        .where(eq(clientReferences.id, id));

    if (!ref.length) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (ref[0].clientId !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Удалить референс (cascade удалит все офферы)
    await db.delete(clientReferences).where(eq(clientReferences.id, id));

    return NextResponse.json({ success: true });
}
