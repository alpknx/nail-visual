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
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_design_id_design_catalog_id_fk" FOREIGN KEY ("design_id") REFERENCES "public"."design_catalog"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "design_catalog_by_source" ON "design_catalog" USING btree ("source","source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "favorites_user_design_uniq" ON "favorites" USING btree ("user_id","design_id");--> statement-breakpoint
CREATE INDEX "favorites_by_user" ON "favorites" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "favorites_by_design" ON "favorites" USING btree ("design_id");