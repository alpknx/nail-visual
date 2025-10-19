import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { isRateLimited } from "@/lib/rate-limit";

const registerSchema = z.object({
    email: z.string().email("Invalid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    role: z.enum(["client", "pro", "admin"]).optional().default("client"),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate input
        const parsed = registerSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message || "Invalid input" },
                { status: 400 }
            );
        }

        const { email, password } = parsed.data;
        const lowercaseEmail = email.toLowerCase().trim();

        // Rate limiting: 5 registration attempts per hour per email
        const rateLimited = await isRateLimited(
            `register:${lowercaseEmail}`,
            5,
            3600000
        );
        if (rateLimited) {
            return NextResponse.json(
                { error: "Too many registration attempts. Please try again later." },
                { status: 429 }
            );
        }

        // Check if user already exists
        const existing = await (db.query.users.findFirst as any)({
            where: (t: any, { eq }: any) => eq(t.email, lowercaseEmail),
        });

        if (existing) {
            // Don't reveal if email exists (security - prevent email enumeration)
            return NextResponse.json(
                { error: "Registration failed. Please try again." },
                { status: 400 }
            );
        }

        // Hash password
        const hashedPassword = await hash(password, 12);

        // Create user with specified role
        const id = crypto.randomUUID();
        await db.insert(users).values({
            id,
            email: lowercaseEmail,
            password: hashedPassword,
            role: parsed.data.role,
        });

        return NextResponse.json({ id, email: lowercaseEmail }, { status: 201 });
    } catch (error) {
        console.error("Registration error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
