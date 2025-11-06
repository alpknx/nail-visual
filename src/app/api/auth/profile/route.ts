import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, phone, city } = body;

    const updated = await db
        .update(users)
        .set({
            name: name || null,
            phone: phone || null,
            city: city || null,
            updatedAt: new Date(),
        })
        .where(eq(users.id, session.user.id))
        .returning();

    return NextResponse.json({
        id: updated[0].id,
        name: updated[0].name,
        email: updated[0].email,
        phone: updated[0].phone,
        city: updated[0].city,
        role: updated[0].role,
    });
}
