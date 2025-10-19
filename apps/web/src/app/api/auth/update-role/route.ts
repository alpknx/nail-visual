import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const updateRoleSchema = z.object({
    userId: z.string().uuid("Invalid user ID"),
    role: z.enum(["client", "pro", "admin"]),
});

export async function POST(request: NextRequest) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Check authorization - only admins can update roles
        if (session.user.role !== "admin") {
            return NextResponse.json(
                { error: "Forbidden: only admins can update user roles" },
                { status: 403 }
            );
        }

        const body = await request.json();

        // Validate input
        const parsed = updateRoleSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message || "Invalid input" },
                { status: 400 }
            );
        }

        const { userId, role } = parsed.data;

        // Check if user exists
        const existing = await (db.query.users.findFirst as any)({
            where: (t: any, { eq: eqOp }: any) => eqOp(t.id, userId),
        });

        if (!existing) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        // Update user role
        await db.update(users).set({ role }).where(eq(users.id, userId));

        return NextResponse.json(
            { id: userId, email: existing.email, role },
            { status: 200 }
        );
    } catch (error) {
        console.error("Update role error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
