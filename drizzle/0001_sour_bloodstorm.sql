CREATE TYPE "public"."booking_status" AS ENUM('pending', 'confirmed', 'cancelled', 'completed');--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'client';--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"master_id" uuid NOT NULL,
	"post_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"status" "booking_status" DEFAULT 'pending' NOT NULL,
	"start_datetime_utc" timestamp with time zone NOT NULL,
	"end_datetime_utc" timestamp with time zone NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "master_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"master_id" uuid NOT NULL,
	"start_datetime_utc" timestamp with time zone NOT NULL,
	"end_datetime_utc" timestamp with time zone NOT NULL,
	"notes" varchar(255),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "master_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"master_id" uuid NOT NULL,
	"timezone" varchar(100) DEFAULT 'Europe/Warsaw' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "master_schedules_master_id_unique" UNIQUE("master_id")
);
--> statement-breakpoint
CREATE TABLE "schedule_ranges" (
	"id" serial PRIMARY KEY NOT NULL,
	"schedule_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" varchar(8) NOT NULL,
	"end_time" varchar(8) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_master_id_master_profiles_user_id_fk" FOREIGN KEY ("master_id") REFERENCES "public"."master_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_overrides" ADD CONSTRAINT "master_overrides_master_id_master_profiles_user_id_fk" FOREIGN KEY ("master_id") REFERENCES "public"."master_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_schedules" ADD CONSTRAINT "master_schedules_master_id_master_profiles_user_id_fk" FOREIGN KEY ("master_id") REFERENCES "public"."master_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_ranges" ADD CONSTRAINT "schedule_ranges_schedule_id_master_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."master_schedules"("id") ON DELETE cascade ON UPDATE no action;