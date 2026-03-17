CREATE TYPE "public"."external_source_type" AS ENUM('github_issue');--> statement-breakpoint
CREATE TYPE "public"."maxdiff_lifecycle_status" AS ENUM('active', 'completed', 'in_progress', 'canceled');--> statement-breakpoint
CREATE TABLE "maxdiff_item_content" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "maxdiff_item_content_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"maxdiff_item_id" integer NOT NULL,
	"conversation_content_id" integer NOT NULL,
	"title" varchar(200) NOT NULL,
	"body" varchar(3000),
	"created_at" timestamp (0) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maxdiff_item_external_source" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "maxdiff_item_external_source_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"maxdiff_item_id" integer NOT NULL,
	"source_type" "external_source_type" NOT NULL,
	"external_id" text NOT NULL,
	"external_url" text,
	"external_metadata" jsonb,
	"last_synced_at" timestamp (0),
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "maxdiff_item_external_source_maxdiff_item_id_unique" UNIQUE("maxdiff_item_id")
);
--> statement-breakpoint
CREATE TABLE "maxdiff_item" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "maxdiff_item_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug_id" varchar(8) NOT NULL,
	"author_id" uuid NOT NULL,
	"conversation_id" integer NOT NULL,
	"current_content_id" integer,
	"is_seed" boolean DEFAULT false NOT NULL,
	"lifecycle_status" "maxdiff_lifecycle_status" DEFAULT 'active' NOT NULL,
	"snapshot_score" real,
	"snapshot_rank" integer,
	"snapshot_participant_count" integer,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "maxdiff_item_slug_id_unique" UNIQUE("slug_id")
);
--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "external_source_config" jsonb;--> statement-breakpoint
ALTER TABLE "maxdiff_item_content" ADD CONSTRAINT "maxdiff_item_content_maxdiff_item_id_maxdiff_item_id_fk" FOREIGN KEY ("maxdiff_item_id") REFERENCES "public"."maxdiff_item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maxdiff_item_content" ADD CONSTRAINT "maxdiff_item_content_conversation_content_id_conversation_content_id_fk" FOREIGN KEY ("conversation_content_id") REFERENCES "public"."conversation_content"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maxdiff_item_external_source" ADD CONSTRAINT "maxdiff_item_external_source_maxdiff_item_id_maxdiff_item_id_fk" FOREIGN KEY ("maxdiff_item_id") REFERENCES "public"."maxdiff_item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maxdiff_item" ADD CONSTRAINT "maxdiff_item_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maxdiff_item" ADD CONSTRAINT "maxdiff_item_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "maxdiff_external_source_dedup_idx" ON "maxdiff_item_external_source" USING btree ("source_type","external_id");--> statement-breakpoint
CREATE INDEX "maxdiff_item_slug_idx" ON "maxdiff_item" USING btree ("slug_id");--> statement-breakpoint
CREATE INDEX "maxdiff_item_conversation_active_idx" ON "maxdiff_item" USING btree ("conversation_id","current_content_id");--> statement-breakpoint
CREATE INDEX "maxdiff_item_lifecycle_idx" ON "maxdiff_item" USING btree ("conversation_id","lifecycle_status");