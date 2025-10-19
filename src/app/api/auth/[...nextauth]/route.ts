import NextAuth, { type NextAuthOptions, type DefaultSession, type DefaultUser } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";

import { db } from "@/db";

// Extend NextAuth types for custom role field
declare module "next-auth" {
    interface Session extends DefaultSession {
        user: {
            id: string;
            role: "client" | "pro" | "admin";
        } & DefaultSession["user"];
    }

    interface User extends DefaultUser {
        role: "client" | "pro" | "admin";
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        role: "client" | "pro" | "admin";
    }
}

const credentialsSchema = z.object({
    email: z.string().email("Invalid email"),
    password: z.string().min(1, "Password required"),
});

export const authOptions: NextAuthOptions = {
    session: { strategy: "jwt" },
    providers: [
        Credentials({
            name: "Email & Password",
            credentials: {
                email: { label: "Email", type: "email", placeholder: "your@email.com" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials) return null;

                const parsed = credentialsSchema.safeParse(credentials);
                if (!parsed.success) return null;

                const { email, password } = parsed.data;
                const lowercaseEmail = email.toLowerCase().trim();

                try {
                    const existing = await (db.query.users.findFirst as any)({
                        where: (t: any, { eq }: any) => eq(t.email, lowercaseEmail),
                    });

                    if (!existing) return null;
                    if (!existing.password) return null;

                    const isPasswordValid = await compare(password, existing.password);
                    if (!isPasswordValid) return null;

                    return {
                        id: existing.id,
                        email: existing.email!,
                        name: existing.name ?? undefined,
                        image: existing.image ?? undefined,
                        role: existing.role as "client" | "pro" | "admin",
                    };
                } catch (error) {
                    console.error("Auth error:", error);
                    return null;
                }
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role;
                token.sub = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.sub as string;
                session.user.role = token.role;
            }
            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
    pages: {
        signIn: "/signin",
    },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
