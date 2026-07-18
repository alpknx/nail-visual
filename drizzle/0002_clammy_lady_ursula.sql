CREATE INDEX "idx_bookings_master_id" ON "bookings" USING btree ("master_id");--> statement-breakpoint
CREATE INDEX "idx_bookings_client_id" ON "bookings" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_bookings_post_id" ON "bookings" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "idx_bookings_master_schedule" ON "bookings" USING btree ("master_id","start_datetime_utc","status");--> statement-breakpoint
CREATE INDEX "idx_master_overrides_master_id" ON "master_overrides" USING btree ("master_id");--> statement-breakpoint
CREATE INDEX "idx_posts_master_id" ON "posts" USING btree ("master_id");