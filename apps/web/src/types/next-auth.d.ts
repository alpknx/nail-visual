import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
    interface Session {
        role?: "client" | "pro" | "admin";
        user: DefaultSession["user"] & { id: string };
    }
}
