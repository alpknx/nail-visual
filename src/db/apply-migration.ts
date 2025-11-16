import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";
import { readFileSync } from "fs";
import { join } from "path";

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
}

const client = postgres(process.env.DATABASE_URL, {
    prepare: false,
    max: 1,
});

async function applyMigration() {
    try {
        const migrationSQL = readFileSync(
            join(process.cwd(), "drizzle", "0008_premium_pride.sql"),
            "utf-8"
        );

        // Разбиваем на отдельные запросы
        const queries = migrationSQL
            .split("--> statement-breakpoint")
            .map(q => q.trim())
            .filter(q => q.length > 0);

        for (const query of queries) {
            if (query.trim()) {
                await client.unsafe(query);
                console.log("✅ Applied:", query.substring(0, 50) + "...");
            }
        }

        console.log("✅ Migration applied successfully!");
    } catch (error: any) {
        // Игнорируем ошибки "already exists" или "duplicate column"
        if (
            error.message?.includes("already exists") || 
            error.code === "42P07" || 
            error.code === "42701" || // duplicate column
            error.message?.includes("duplicate column")
        ) {
            console.log("⚠️  Column already exists, skipping...");
        } else {
            throw error;
        }
    } finally {
        await client.end();
    }
}

applyMigration()
    .catch((e) => {
        console.error("❌ Migration failed:", e);
        process.exit(1);
    });

