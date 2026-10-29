CREATE TABLE "ai_activity" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"summary" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_memory" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"content" text NOT NULL,
	"source" text DEFAULT 'system' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_observations" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"source" text DEFAULT 'system' NOT NULL,
	"data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"concept" text,
	"objective" text,
	"content_pillar" text,
	"format" text,
	"hook" text,
	"status" text DEFAULT 'idea' NOT NULL,
	"planned_for" timestamp with time zone,
	"created_by" text DEFAULT 'ai' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_strategy" (
	"id" serial PRIMARY KEY NOT NULL,
	"objective" text NOT NULL,
	"audience" text,
	"pillars" jsonb,
	"formats" jsonb,
	"tone" text,
	"posting_strategy" text,
	"experiments" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "human_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "tiktok_account" (
	"id" serial PRIMARY KEY NOT NULL,
	"tiktok_open_id" text NOT NULL,
	"display_name" text DEFAULT '' NOT NULL,
	"avatar_url" text DEFAULT '' NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"token_expires_at" timestamp with time zone,
	"scopes" text DEFAULT '' NOT NULL,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tiktok_account_tiktok_open_id_unique" UNIQUE("tiktok_open_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "tiktok_open_id_idx" ON "tiktok_account" USING btree ("tiktok_open_id");