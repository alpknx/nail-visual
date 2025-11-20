import type { DefaultSession, DefaultUser } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";

import { db } from "@/db";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: "client" | "pro" | "admin";
      phone?: string | null;
      city?: string | null;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: "client" | "pro" | "admin";
    phone?: string | null;
    city?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: "client" | "pro" | "admin";
    phone?: string | null;
    city?: string | null;
  }
}

const credentialsSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password required"),
});

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === "production" ? "__Secure-" : ""}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production" || process.env.VERCEL === "1",
        maxAge: 30 * 24 * 60 * 60,
      },
    },
  },
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

          if (!existing || !existing.password) return null;

          const isPasswordValid = await compare(password, existing.password);
          if (!isPasswordValid) return null;

          return {
            id: existing.id,
            email: existing.email!,
            name: existing.name ?? undefined,
            image: existing.image ?? undefined,
            phone: existing.phone ?? undefined,
            city: existing.city ?? undefined,
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
    async jwt({ token, user, trigger }) {
      if (user) {
        token.role = user.role;
        token.sub = user.id;
        token.phone = (user as any).phone ?? null;
        token.city = (user as any).city ?? null;
      }
      
      // Обновляем данные из базы при каждом запросе сессии (например, после updateSession)
      if (trigger === "update" || !token.city) {
        try {
          const dbUser = await (db.query.users.findFirst as any)({
            where: (t: any, { eq }: any) => eq(t.id, token.sub),
          });
          
          if (dbUser) {
            token.phone = dbUser.phone ?? null;
            token.city = dbUser.city ?? null;
            token.role = dbUser.role as "client" | "pro" | "admin";
          }
        } catch (error) {
          console.error("Error updating JWT token:", error);
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as typeof session.user.role;
        (session.user as any).phone = token.phone ?? null;
        (session.user as any).city = token.city ?? null;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/signin",
  },
};
