import NextAuth from "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            email?: string | null;
            name?: string | null;
            image?: string | null;
            role: "client" | "pro" | "admin";
        };
    }

    interface User {
        id: string;
        role: "client" | "pro" | "admin";
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        uid: string;
        role: "client" | "pro" | "admin";
    }
}
