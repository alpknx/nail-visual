ALTER TABLE "works" RENAME TO "pro_works";--> statement-breakpoint
ALTER TABLE "pro_works" DROP CONSTRAINT "works_pro_id_users_id_fk";
--> statement-breakpoint
DROP INDEX "works_by_pro_created_at";--> statement-breakpoint
DROP INDEX "works_by_city";--> statement-breakpoint
ALTER TABLE "pro_works" ADD CONSTRAINT "pro_works_pro_id_users_id_fk" FOREIGN KEY ("pro_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pro_works_by_pro_created_at" ON "pro_works" USING btree ("pro_id","created_at");--> statement-breakpoint
CREATE INDEX "pro_works_by_city" ON "pro_works" USING btree ("city");