-- Migration 0002: Add tiktok_browser_account, browser_observation, and ai_memory.account_id
-- Safe to run: uses IF NOT EXISTS for idempotency

CREATE TABLE IF NOT EXISTS "tiktok_browser_account" (
	"id" serial PRIMARY KEY NOT NULL,
	"platform" text DEFAULT 'tiktok' NOT NULL,
	"username" text,
	"display_name" text,
	"profile_url" text,
	"avatar_url" text,
	"browser_profile_id" text,
	"status" text DEFAULT 'not_connected' NOT NULL,
	"runtime_status" text DEFAULT 'offline',
	"runtime_source" text DEFAULT 'local',
	"last_heartbeat_at" timestamp with time zone,
	"last_observed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "browser_observation" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"page" text NOT NULL,
	"category" text NOT NULL,
	"raw_summary" text,
	"structured_data" jsonb,
	"important_findings" jsonb,
	"changes_detected" jsonb,
	"confidence" text DEFAULT 'observed' NOT NULL,
	"screenshot_path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
	ALTER TABLE "ai_memory" ADD COLUMN "account_id" integer;
EXCEPTION
	WHEN duplicate_column THEN null;
END $$;