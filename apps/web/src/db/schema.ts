import {
    pgTable, text, varchar, timestamp, boolean, integer, uuid, pgEnum,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/** enums **/
export const userRole = pgEnum("user_role", ["client","pro","admin"]);
export const referenceStatus = pgEnum("reference_status", ["open","matched","closed"]);
export const offerStatus = pgEnum("offer_status", ["offer","accepted","declined"]);

/** next-auth core **/
export const users = pgTable("users", {
    id: text("id").primaryKey(),
    name: varchar("name", { length: 200 }),
    email: varchar("email", { length: 320 }).unique(),
    emailVerified: timestamp("email_verified", { withTimezone: true }),
    image: text("image"),
    role: userRole("role").notNull().default("client"),
    city: varchar("city", { length: 120 }),
    phone: varchar("phone", { length: 40 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const accounts = pgTable("accounts", {
    userId: text("user_id").notNull(),
    type: text("type").notNull(),
    provider: varchar("provider", { length: 100 }).notNull(),
    providerAccountId: varchar("provider_account_id", { length: 200 }).notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: varchar("token_type", { length: 50 }),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
}, (t) => ({
    pk: sql`ALTER TABLE ${t} ADD PRIMARY KEY (provider, provider_account_id)`.as(t),
}));

export const sessions = pgTable("sessions", {
    sessionToken: varchar("session_token", { length: 255 }).primaryKey(),
    userId: text("user_id").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable("verification_tokens", {
    identifier: varchar("identifier", { length: 255 }).notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
}, (t) => ({
    pk: sql`ALTER TABLE ${t} ADD PRIMARY KEY (identifier, token)`.as(t),
}));

/** pro profile + контент **/
export const proProfiles = pgTable("pro_profiles", {
    userId: text("user_id").primaryKey().references(() => users.id),
    bio: text("bio"),
    instagram: varchar("instagram", { length: 200 }),
    minPricePln: integer("min_price_pln"),
    isVerified: boolean("is_verified").notNull().default(false),
});

export const works = pgTable("works", {
    id: uuid("id").primaryKey().defaultRandom(),
    proId: text("pro_id").notNull().references(() => users.id),
    imageUrl: text("image_url").notNull(),
    caption: text("caption"),
    tags: text("tags").array(),
    city: varchar("city", { length: 120 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => ({
    byPro: sql`CREATE INDEX IF NOT EXISTS works_by_pro_created_at ON works (pro_id, created_at DESC)`.as(t),
    byCity: sql`CREATE INDEX IF NOT EXISTS works_by_city ON works (city)`.as(t),
    tagsGin: sql`CREATE INDEX IF NOT EXISTS works_tags_gin ON works USING GIN (tags)`.as(t),
}));

export const clientReferences = pgTable("client_references", {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: text("client_id").notNull().references(() => users.id),
    imageUrl: text("image_url").notNull(),
    note: text("note"),
    tags: text("tags").array(),
    city: varchar("city", { length: 120 }),
    status: referenceStatus("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => ({
    byCity: sql`CREATE INDEX IF NOT EXISTS refs_by_city_created_at ON client_references (city, created_at DESC)`.as(t),
    tagsGin: sql`CREATE INDEX IF NOT EXISTS refs_tags_gin ON client_references USING GIN (tags)`.as(t),
}));

export const offers = pgTable("offers", {
    id: uuid("id").primaryKey().defaultRandom(),
    refId: uuid("ref_id").notNull().references(() => clientReferences.id),
    proId: text("pro_id").notNull().references(() => users.id),
    message: text("message"),
    pricePln: integer("price_pln"),
    status: offerStatus("status").notNull().default("offer"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
}, (t) => ({
    uniqRefPro: sql`ALTER TABLE ${t} ADD CONSTRAINT offers_ref_pro_uniq UNIQUE (ref_id, pro_id)`.as(t),
    byProStatus: sql`CREATE INDEX IF NOT EXISTS offers_by_pro_status ON offers (pro_id, status)`.as(t),
    byRef: sql`CREATE INDEX IF NOT EXISTS offers_by_ref ON offers (ref_id)`.as(t),
    oneAcceptedPerRef: sql`
    CREATE UNIQUE INDEX IF NOT EXISTS offers_one_accepted_per_ref
    ON offers (ref_id)
    WHERE status = 'accepted'
  `.as(t),
}));
