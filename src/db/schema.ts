import { relations } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  pgEnum,
  serial,
  integer,
  jsonb,
  bigint,
  uniqueIndex,
  primaryKey,
  customType
} from 'drizzle-orm/pg-core';

// ==========================================
// 0. CUSTOM TYPES & HELPERS
// ==========================================

// Helper for PostGIS Geography type
const geography = customType<{ data: string }>({
  dataType: () => 'geography(POINT, 4326)',
});

// ==========================================
// 1. ENUMS
// ==========================================
export const userRoleEnum = pgEnum('user_role', ['master', 'client']);
export const bookingStatusEnum = pgEnum('booking_status', ['pending', 'confirmed', 'cancelled', 'completed']);

// ==========================================
// 2. AUTHENTICATION (NextAuth / Auth.js)
// ==========================================

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }),
  email: varchar('email', { length: 255 }).unique(),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  passwordHash: varchar('password_hash', { length: 255 }),
  role: userRoleEnum('role').default('master'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().references(() => users.email, { onDelete: 'cascade' }),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const accounts = pgTable('accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 255 }).notNull(),
  provider: varchar('provider', { length: 255 }).notNull(),
  providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
  refreshToken: text('refresh_token'),
  accessToken: text('access_token'),
  expiresAt: bigint('expires_at', { mode: 'number' }),
  tokenType: varchar('token_type', { length: 255 }),
  scope: text('scope'),
  idToken: text('id_token'),
  sessionState: text('session_state'),
}, (table) => [
  uniqueIndex('idx_accounts_provider_compound').on(table.provider, table.providerAccountId),
]);

export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionToken: varchar('session_token', { length: 255 }).notNull().unique(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull(),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
}, (table) => [
  primaryKey({ columns: [table.identifier, table.token] }),
]);

// ==========================================
// 3. MASTER PROFILES
// ==========================================

export const masterProfiles = pgTable('master_profiles', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  businessName: varchar('business_name', { length: 255 }).notNull(),
  bio: varchar('bio', { length: 255 }),
  avatarUrl: text('avatar_url'),

  // Location
  addressText: varchar('address_text', { length: 255 }),
  city: varchar('city', { length: 255 }),
  zipCode: varchar('zip_code', { length: 20 }),
  location: geography('location'),

  // Contact
  phoneCountryCode: varchar('phone_country_code', { length: 10 }).default('+1'),
  phoneNumber: varchar('phone_number', { length: 50 }).notNull(),

  updatedAt: timestamp('updated_at').defaultNow(),
});

// ==========================================
// 4. PORTFOLIO & TAGS
// ==========================================

type TranslationJSON = { [lang: string]: string };

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  nameTranslations: jsonb('name_translations').$type<TranslationJSON>().notNull(),
  sortOrder: integer('sort_order').default(0),
});

export const tags = pgTable('tags', {
  id: serial('id').primaryKey(),
  categoryId: integer('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
  slug: varchar('slug', { length: 255 }).notNull(),
  nameTranslations: jsonb('name_translations').$type<TranslationJSON>().notNull(),
}, (table) => [
  uniqueIndex('idx_tags_category_slug').on(table.categoryId, table.slug),
]);

export const posts = pgTable('posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  masterId: uuid('master_id').references(() => masterProfiles.userId, { onDelete: 'cascade' }),
  imageUrl: text('image_url').notNull(),
  price: integer('price'), // Store as cents
  currency: varchar('currency', { length: 10 }).default('PLN'),
  durationMinutes: integer('duration_minutes'),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const postTags = pgTable('post_tags', {
  postId: uuid('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  tagId: integer('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (table) => [
  primaryKey({ columns: [table.postId, table.tagId] }),
]);

// ==========================================
// 5. BOOKING SYSTEM
// ==========================================

// Рабочее расписание мастера (1:1 с masterProfiles)
export const masterSchedules = pgTable('master_schedules', {
  id: uuid('id').defaultRandom().primaryKey(),
  masterId: uuid('master_id').notNull().unique().references(() => masterProfiles.userId, { onDelete: 'cascade' }),
  timezone: varchar('timezone', { length: 100 }).notNull().default('Europe/Warsaw'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Рабочие часы по дням недели
export const scheduleRanges = pgTable('schedule_ranges', {
  id: serial('id').primaryKey(),
  scheduleId: uuid('schedule_id').notNull().references(() => masterSchedules.id, { onDelete: 'cascade' }),
  dayOfWeek: integer('day_of_week').notNull(), // 1=Mon ... 7=Sun
  startTime: varchar('start_time', { length: 8 }).notNull(), // HH:mm
  endTime: varchar('end_time', { length: 8 }).notNull(),     // HH:mm
});

// Блокировки времени (перерывы, отпуск, недоступность)
export const masterOverrides = pgTable('master_overrides', {
  id: uuid('id').defaultRandom().primaryKey(),
  masterId: uuid('master_id').notNull().references(() => masterProfiles.userId, { onDelete: 'cascade' }),
  startDatetimeUtc: timestamp('start_datetime_utc', { withTimezone: true }).notNull(),
  endDatetimeUtc: timestamp('end_datetime_utc', { withTimezone: true }).notNull(),
  notes: varchar('notes', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
});

// Бронирования
export const bookings = pgTable('bookings', {
  id: uuid('id').defaultRandom().primaryKey(),
  masterId: uuid('master_id').notNull().references(() => masterProfiles.userId, { onDelete: 'cascade' }),
  postId: uuid('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: bookingStatusEnum('status').notNull().default('pending'),
  startDatetimeUtc: timestamp('start_datetime_utc', { withTimezone: true }).notNull(),
  endDatetimeUtc: timestamp('end_datetime_utc', { withTimezone: true }).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ==========================================
// 6. RELATIONS (Application Level)
// ==========================================

export const usersRelations = relations(users, ({ one, many }) => ({
  masterProfile: one(masterProfiles, {
    fields: [users.id],
    references: [masterProfiles.userId],
  }),
  accounts: many(accounts),
  sessions: many(sessions),
  bookings: many(bookings),
}));

export const masterProfileRelations = relations(masterProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [masterProfiles.userId],
    references: [users.id],
  }),
  posts: many(posts),
  schedule: one(masterSchedules, {
    fields: [masterProfiles.userId],
    references: [masterSchedules.masterId],
  }),
  overrides: many(masterOverrides),
  bookings: many(bookings),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  tags: many(tags),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  category: one(categories, {
    fields: [tags.categoryId],
    references: [categories.id],
  }),
  posts: many(postTags),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(masterProfiles, {
    fields: [posts.masterId],
    references: [masterProfiles.userId],
  }),
  tags: many(postTags),
  bookings: many(bookings),
}));

export const postTagsRelations = relations(postTags, ({ one }) => ({
  post: one(posts, {
    fields: [postTags.postId],
    references: [posts.id],
  }),
  tag: one(tags, {
    fields: [postTags.tagId],
    references: [tags.id],
  }),
}));

export const masterSchedulesRelations = relations(masterSchedules, ({ one, many }) => ({
  master: one(masterProfiles, {
    fields: [masterSchedules.masterId],
    references: [masterProfiles.userId],
  }),
  ranges: many(scheduleRanges),
}));

export const scheduleRangesRelations = relations(scheduleRanges, ({ one }) => ({
  schedule: one(masterSchedules, {
    fields: [scheduleRanges.scheduleId],
    references: [masterSchedules.id],
  }),
}));

export const masterOverridesRelations = relations(masterOverrides, ({ one }) => ({
  master: one(masterProfiles, {
    fields: [masterOverrides.masterId],
    references: [masterProfiles.userId],
  }),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  master: one(masterProfiles, {
    fields: [bookings.masterId],
    references: [masterProfiles.userId],
  }),
  post: one(posts, {
    fields: [bookings.postId],
    references: [posts.id],
  }),
  client: one(users, {
    fields: [bookings.clientId],
    references: [users.id],
  }),
}));
