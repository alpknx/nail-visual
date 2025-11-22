CREATE TYPE "public"."offer_status" AS ENUM('offer', 'accepted', 'declined');--> statement-breakpoint
CREATE TYPE "public"."reference_status" AS ENUM('open', 'matched', 'closed');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('client', 'pro', 'admin');--> statement-breakpoint

CREATE TABLE "client_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" text NOT NULL,
	"image_url" text NOT NULL,
	"note" text,
	"tags" text[],
	"city" varchar(120),
	"status" "reference_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "design_catalog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"image_url" text NOT NULL,
	"description" text,
	"tags" text[],
	"source" varchar(50) DEFAULT 'unsplash',
	"source_id" varchar(200),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"design_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref_id" uuid NOT NULL,
	"pro_id" text NOT NULL,
	"message" text,
	"price_pln" integer,
	"status" "offer_status" DEFAULT 'offer' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"accepted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "pro_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"bio" text,
	"instagram" varchar(200),
	"facebook" varchar(200),
	"whatsapp" varchar(40),
	"telegram" varchar(200),
	"phone" varchar(40),
	"external_link" varchar(500),
	"min_price_pln" integer,
	"is_verified" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pro_works" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pro_id" text NOT NULL,
	"image_url" text NOT NULL,
	"caption" text,
	"tags" text[],
	"city" varchar(120),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(200),
	"email" varchar(320),
	"email_verified" timestamp with time zone,
	"image" text,
	"password" text,
	"role" "user_role" DEFAULT 'client' NOT NULL,
	"city" varchar(120),
	"phone" varchar(40),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "client_references" ADD CONSTRAINT "client_references_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_design_id_design_catalog_id_fk" FOREIGN KEY ("design_id") REFERENCES "public"."design_catalog"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_ref_id_client_references_id_fk" FOREIGN KEY ("ref_id") REFERENCES "public"."client_references"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_pro_id_users_id_fk" FOREIGN KEY ("pro_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pro_profiles" ADD CONSTRAINT "pro_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pro_works" ADD CONSTRAINT "pro_works_pro_id_users_id_fk" FOREIGN KEY ("pro_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "refs_by_city_created_at" ON "client_references" USING btree ("city","created_at");--> statement-breakpoint
CREATE INDEX "refs_by_client_id" ON "client_references" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "refs_by_status" ON "client_references" USING btree ("status");--> statement-breakpoint
CREATE INDEX "design_catalog_by_source" ON "design_catalog" USING btree ("source","source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "favorites_user_design_uniq" ON "favorites" USING btree ("user_id","design_id");--> statement-breakpoint
CREATE INDEX "favorites_by_user" ON "favorites" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "favorites_by_design" ON "favorites" USING btree ("design_id");--> statement-breakpoint
CREATE UNIQUE INDEX "offers_ref_pro_uniq" ON "offers" USING btree ("ref_id","pro_id");--> statement-breakpoint
CREATE INDEX "offers_by_pro_status" ON "offers" USING btree ("pro_id","status");--> statement-breakpoint
CREATE INDEX "offers_by_ref" ON "offers" USING btree ("ref_id");--> statement-breakpoint
CREATE INDEX "pro_works_by_pro_created_at" ON "pro_works" USING btree ("pro_id","created_at");--> statement-breakpoint
CREATE INDEX "pro_works_by_city" ON "pro_works" USING btree ("city");--> statement-breakpoint
CREATE INDEX "pro_works_tags_gin" ON "pro_works" USING GIN ("tags");--> statement-breakpoint
CREATE INDEX "refs_tags_gin" ON "client_references" USING GIN ("tags");--> statement-breakpoint
CREATE INDEX "design_catalog_tags_gin" ON "design_catalog" USING GIN ("tags");--> statement-breakpoint
CREATE UNIQUE INDEX "offers_one_accepted_per_ref" ON "offers" ("ref_id") WHERE "status" = 'accepted';