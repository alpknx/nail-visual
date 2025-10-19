import "dotenv/config"; // подхватит .env / .env.local из CWD
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { users, proProfiles, works } from "./schema";

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function main() {
    // pro
    const proId = crypto.randomUUID();
    await db.insert(users).values({
        id: proId,
        email: "pro@example.com",
        role: "pro",
        name: "Pro Master",
        city: "Krakow",
    });
    await db.insert(proProfiles).values({
        userId: proId,
        instagram: "@promaster",
        minPricePln: 120,
        isVerified: true,
    });

    // client
    const clientId = crypto.randomUUID();
    await db.insert(users).values({
        id: clientId,
        email: "client@example.com",
        role: "client",
        name: "Client Girl",
        city: "Almaty",
    });

    // немного работ, чтобы /pros не был пуст
    await db.insert(works).values([
        {
            proId,
            imageUrl: "https://picsum.photos/400/500?1",
            tags: ["french", "nude"],
            city: "Almaty",
        },
        {
            proId,
            imageUrl: "https://picsum.photos/400/500?2",
            tags: ["red", "chrome"],
            city: "Almaty",
        },
    ]);

    console.log("✅ seed ok");
}

main()
    .catch((e) => {
        console.error("❌ seed failed", e);
        process.exit(1);
    })
    .finally(async () => {
        await pool.end();
    });
