ALTER TABLE "client_references" DROP CONSTRAINT "client_references_client_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "offers" DROP CONSTRAINT "offers_ref_id_client_references_id_fk";
--> statement-breakpoint
ALTER TABLE "offers" DROP CONSTRAINT "offers_pro_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "pro_profiles" DROP CONSTRAINT "pro_profiles_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "works" DROP CONSTRAINT "works_pro_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id");--> statement-breakpoint
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token");--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_references" ADD CONSTRAINT "client_references_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_ref_id_client_references_id_fk" FOREIGN KEY ("ref_id") REFERENCES "public"."client_references"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_pro_id_users_id_fk" FOREIGN KEY ("pro_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pro_profiles" ADD CONSTRAINT "pro_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "works" ADD CONSTRAINT "works_pro_id_users_id_fk" FOREIGN KEY ("pro_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_by_user" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "refs_by_city_created_at" ON "client_references" USING btree ("city","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "offers_ref_pro_uniq" ON "offers" USING btree ("ref_id","pro_id");--> statement-breakpoint
CREATE INDEX "offers_by_pro_status" ON "offers" USING btree ("pro_id","status");--> statement-breakpoint
CREATE INDEX "offers_by_ref" ON "offers" USING btree ("ref_id");--> statement-breakpoint
CREATE INDEX "works_by_pro_created_at" ON "works" USING btree ("pro_id","created_at");--> statement-breakpoint
CREATE INDEX "works_by_city" ON "works" USING btree ("city");