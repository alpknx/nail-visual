import "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            email?: string | null;
            name?: string | null;
            image?: string | null;
            role: "master" | "client";
        };
    }

    interface User {
        id: string;
        role: "master" | "client";
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        sub: string;
        role: "master" | "client";
    }
}
