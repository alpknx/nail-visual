import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";
import { readFileSync } from "fs";
import { readdir } from "fs/promises";
import { join } from "path";

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
}

const client = postgres(process.env.DATABASE_URL, {
    prepare: false,
    max: 1,
});

async function applyAllMigrations() {
    try {
        // Получаем список всех SQL файлов миграций
        const migrationsDir = join(process.cwd(), "drizzle");
        const files = await readdir(migrationsDir);
        const sqlFiles = files
            .filter(f => f.endsWith(".sql"))
            .sort(); // Сортируем по имени (они уже в правильном порядке)

        console.log(`📋 Found ${sqlFiles.length} migration files`);

        for (const file of sqlFiles) {
            console.log(`\n📄 Processing: ${file}`);
            
            try {
                const migrationSQL = readFileSync(
                    join(migrationsDir, file),
                    "utf-8"
                );

                // Разбиваем на отдельные запросы
                const queries = migrationSQL
                    .split("--> statement-breakpoint")
                    .map(q => q.trim())
                    .filter(q => q.length > 0);

                for (const query of queries) {
                    if (query.trim()) {
                        try {
                            await client.unsafe(query);
                            console.log(`  ✅ Applied: ${query.substring(0, 60).replace(/\n/g, " ")}...`);
                        } catch (error: any) {
                            // Игнорируем ошибки "already exists" или "duplicate column"
                            if (
                                error.message?.includes("already exists") || 
                                error.code === "42P07" || // relation already exists
                                error.code === "42701" || // duplicate column
                                error.code === "42P06" || // schema already exists
                                error.message?.includes("duplicate column") ||
                                error.message?.includes("already exists")
                            ) {
                                console.log(`  ⚠️  Skipped (already exists): ${query.substring(0, 60).replace(/\n/g, " ")}...`);
                            } else {
                                throw error;
                            }
                        }
                    }
                }
            } catch (error: any) {
                console.error(`  ❌ Error processing ${file}:`, error.message);
                // Продолжаем с следующей миграцией
            }
        }

        console.log("\n✅ All migrations processed!");
    } catch (error: any) {
        console.error("❌ Migration failed:", error);
        throw error;
    } finally {
        await client.end();
    }
}

applyAllMigrations()
    .catch((e) => {
        console.error("❌ Migration failed:", e);
        process.exit(1);
    });

