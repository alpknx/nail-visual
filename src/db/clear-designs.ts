import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { designCatalog, favorites } from "./schema";
import { sql } from "drizzle-orm";

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
}

const client = postgres(process.env.DATABASE_URL, {
    prepare: false,
    max: 1,
});
const db = drizzle(client);

async function clearDesigns() {
    console.log("🗑️  Clearing design catalog...");
    
    // Сначала удаляем избранное (из-за foreign key constraint)
    await db.delete(favorites);
    console.log("✅ Cleared favorites");
    
    // Затем удаляем дизайны
    await db.delete(designCatalog);
    console.log("✅ Cleared design catalog");
    
    console.log("✅ Design catalog cleared successfully!");
}

clearDesigns()
    .catch((e) => {
        console.error("❌ Clear failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await client.end();
    });

