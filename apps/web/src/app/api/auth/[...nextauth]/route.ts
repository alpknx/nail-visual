import NextAuth, { type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";

import { db } from "@/db";
import { accounts, sessions, users, verificationTokens } from "@/db/schema";

export const authOptions: NextAuthOptions = {
    adapter: DrizzleAdapter(db, {
        usersTable: users,
        accountsTable: accounts,
        sessionsTable: sessions,
        verificationTokensTable: verificationTokens,
    }) as any,
    session: { strategy: "jwt" },
    providers: [
        Credentials({
            name: "Email",
            credentials: { email: { label: "Email", type: "email" } },
            async authorize(creds) {
                const email = String(creds?.email || "").toLowerCase().trim();
                if (!email) return null;

                const existing = await db.query.users.findFirst({
                    where: (t, { eq }) => eq(t.email, email),
                });
                if (existing) {
                    return {
                        id: existing.id,
                        email: existing.email!,
                        name: existing.name ?? undefined,
                        image: existing.image ?? undefined,
                        role: existing.role,
                    } as any;
                }
                // новый клиент по умолчанию
                const id = crypto.randomUUID();
                await db.insert(users).values({ id, email, role: "client" });
                return { id, email, role: "client" } as any;
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = (user as any).role ?? "client";
                token.sub = (user as any).id ?? token.sub;
            }
            return token;
        },
        async session({ session, token }) {
            (session as any).role = (token as any).role ?? "client";
            if (session.user) session.user.id = token.sub as string;
            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
