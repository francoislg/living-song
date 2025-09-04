ALTER TABLE "song" ADD COLUMN "is_promoted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "song" ADD COLUMN "promoted_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "lastUpload" timestamp with time zone;