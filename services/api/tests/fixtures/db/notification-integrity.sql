-- WARNING: GENERATED FROM services/shared-backend/src/schema.ts. DO NOT EDIT.
-- Regenerate with: make sync-api-test-db-fixtures

CREATE TYPE "public"."export_cancellation_reason_enum" AS ENUM('duplicate_in_batch', 'cooldown_active');

CREATE TYPE "public"."export_failure_reason_enum" AS ENUM('processing_error', 'timeout', 'server_restart');

CREATE TYPE "public"."notification_type_enum" AS ENUM('opinion_vote', 'new_opinion', 'export_started', 'export_completed', 'export_failed', 'export_cancelled', 'import_started', 'import_completed', 'import_failed', 'security_add_email');

CREATE TABLE "notification_export" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "notification_export_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"notification_id" integer NOT NULL,
	"export_request_id" integer,
	"export_slug_id" varchar(8) NOT NULL,
	"conversation_id" integer NOT NULL,
	"failure_reason" "export_failure_reason_enum",
	"cancellation_reason" "export_cancellation_reason_enum",
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "notification_export_notification_unique" UNIQUE("notification_id")
);

CREATE TABLE "notification_import" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "notification_import_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"notification_id" integer NOT NULL,
	"import_id" integer NOT NULL,
	"conversation_id" integer,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "notification_import_notification_unique" UNIQUE("notification_id")
);

CREATE TABLE "notification_new_opinion" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "notification_new_opinion_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"notification_id" integer NOT NULL,
	"author_id" uuid NOT NULL,
	"opinion_id" integer NOT NULL,
	"conversation_id" integer NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "notification_new_opinion_notification_unique" UNIQUE("notification_id")
);

CREATE TABLE "notification_opinion_vote" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "notification_opinion_vote_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"notification_id" integer NOT NULL,
	"opinion_id" integer NOT NULL,
	"conversation_id" integer NOT NULL,
	"num_votes" integer DEFAULT 1 NOT NULL,
	"is_seed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "notification_opinion_vote_notification_unique" UNIQUE("notification_id"),
	CONSTRAINT "notification_opinion_vote_positive_count" CHECK ("notification_opinion_vote"."num_votes" >= 1)
);

CREATE TABLE "notification" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "notification_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug_id" varchar(8) NOT NULL,
	"user_id" uuid NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"notification_type" "notification_type_enum" NOT NULL,
	"security_key" varchar(64),
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "notification_slug_id_unique" UNIQUE("slug_id")
);

CREATE INDEX "notification_user_created_id_idx" ON "notification" USING btree ("user_id","created_at" DESC,"id" DESC);

CREATE UNIQUE INDEX "notification_user_security_key_unique" ON "notification" USING btree ("user_id","security_key");
