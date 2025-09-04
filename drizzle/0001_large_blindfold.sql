CREATE TYPE "public"."song_type" AS ENUM('Melody', 'Bass', 'Drum', 'Other 1', 'Other 2');--> statement-breakpoint
CREATE TABLE "song" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"type" "song_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "song" ADD CONSTRAINT "song_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;