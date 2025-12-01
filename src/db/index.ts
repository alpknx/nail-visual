import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema"; // ← добавь

const client = postgres(process.env.DATABASE_URL!, {
    prepare: false,
    max: 10, // Increased connection pool for better performance
    idle_timeout: 20,
    connect_timeout: 10,
});

export const db = drizzle(client, { schema });
export { schema };
