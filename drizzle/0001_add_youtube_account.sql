CREATE TABLE "youtube_account" (
	"id" serial PRIMARY KEY NOT NULL,
	"google_user_id" text NOT NULL,
	"channel_title" text DEFAULT '' NOT NULL,
	"channel_thumbnail" text DEFAULT '' NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"token_expires_at" timestamp with time zone,
	"scopes" text DEFAULT '' NOT NULL,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "youtube_account_google_user_id_unique" UNIQUE("google_user_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "google_user_id_idx" ON "youtube_account" USING btree ("google_user_id");
