import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema"; // ← добавь

// NOTE: deliberately does NOT import from "@/lib/env" here. ES module
// imports are hoisted and evaluated before this file's own top-level code
// (including the dotenv config() call above) runs - importing env.ts's
// synchronous validation here would run it against an empty process.env
// whenever this module is loaded by a standalone tsx script (db/seed.ts,
// db/reset.ts) rather than through Next.js's own env loading, which always
// primes process.env before any app code runs regardless of import order.
if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
}

const client = postgres(process.env.DATABASE_URL, {
    prepare: false,
    max: 10, // Increased connection pool for better performance
    idle_timeout: 20,
    connect_timeout: 10,
});

export const db = drizzle(client, { schema });
export { schema };
