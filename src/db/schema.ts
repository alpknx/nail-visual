// src/db/schema.ts
import {
    pgTable,
    text,
    varchar,
    timestamp,
    boolean,
    integer,
    uuid,
    pgEnum,
    index,
    uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/** enums **/
export const userRole = pgEnum("user_role", ["client", "pro", "admin"]);
export const referenceStatus = pgEnum("reference_status", ["open", "matched", "closed"]);
export const offerStatus = pgEnum("offer_status", ["offer", "accepted", "declined"]);

/** next-auth core **/
export const users = pgTable("users", {
    id: text("id").primaryKey(),
    name: varchar("name", { length: 200 }),
    email: varchar("email", { length: 320 }).unique(),
    emailVerified: timestamp("email_verified", { withTimezone: true }),
    image: text("image"),
    password: text("password"), // For email/password auth
    role: userRole("role").notNull().default("client"),
    city: varchar("city", { length: 120 }),
    phone: varchar("phone", { length: 40 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

/** pro profile + контент */
export const proProfiles = pgTable("pro_profiles", {
    userId: text("user_id")
        .primaryKey()
        .references(() => users.id, { onDelete: "cascade" }),
    bio: text("bio"),
    instagram: varchar("instagram", { length: 200 }),
    minPricePln: integer("min_price_pln"),
    isVerified: boolean("is_verified").notNull().default(false),
});

export const proWorks = pgTable(
    "pro_works",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        proId: text("pro_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        imageUrl: text("image_url").notNull(),
        caption: text("caption"),
        tags: text("tags").array(), // text[]
        city: varchar("city", { length: 120 }),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    },
    (t) => ({
        byProCreatedAt: index("pro_works_by_pro_created_at").on(t.proId, t.createdAt),
        byCity: index("pro_works_by_city").on(t.city),
        // GIN для массива тегов — через raw SQL с ИМЕНЕМ индекса
        tagsGin: sql`CREATE INDEX IF NOT EXISTS "pro_works_tags_gin" ON "pro_works" USING GIN ("tags")`.as(
            "pro_works_tags_gin",
        ),
    }),
);

export const clientReferences = pgTable(
    "client_references",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        clientId: text("client_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        imageUrl: text("image_url").notNull(),
        note: text("note"),
        tags: text("tags").array(), // text[]
        city: varchar("city", { length: 120 }),
        status: referenceStatus("status").notNull().default("open"),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    },
    (t) => ({
        byCityCreatedAt: index("refs_by_city_created_at").on(t.city, t.createdAt),
        tagsGin: sql`CREATE INDEX IF NOT EXISTS "refs_tags_gin" ON "client_references" USING GIN ("tags")`.as(
            "refs_tags_gin",
        ),
    }),
);

export const offers = pgTable(
    "offers",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        refId: uuid("ref_id")
            .notNull()
            .references(() => clientReferences.id, { onDelete: "cascade" }),
        proId: text("pro_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        message: text("message"),
        pricePln: integer("price_pln"),
        status: offerStatus("status").notNull().default("offer"),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
        acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    },
    (t) => ({
        // один оффер от одного мастера на один референс
        uniqRefPro: uniqueIndex("offers_ref_pro_uniq").on(t.refId, t.proId),
        byProStatus: index("offers_by_pro_status").on(t.proId, t.status),
        byRef: index("offers_by_ref").on(t.refId),

        // частичный unique: только один accepted на refId
        // drizzle пока не умеет partial unique декларативно — делаем raw SQL с ИМЕНЕМ индекса
        oneAcceptedPerRef: sql`
      CREATE UNIQUE INDEX IF NOT EXISTS "offers_one_accepted_per_ref"
      ON "offers" ("ref_id")
      WHERE "status" = 'accepted'
    `.as("offers_one_accepted_per_ref"),
    }),
);
