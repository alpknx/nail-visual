ALTER TABLE "bookings" ALTER COLUMN "client_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "guest_name" varchar(255);--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "guest_email" varchar(255);--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "guest_phone" varchar(50);