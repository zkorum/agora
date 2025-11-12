CREATE TYPE "public"."event_slug" AS ENUM('devconnect-2025');--> statement-breakpoint
CREATE TYPE "public"."ticket_provider" AS ENUM('zupass');--> statement-breakpoint
ALTER TYPE "public"."auth_type" ADD VALUE 'merge';--> statement-breakpoint
ALTER TYPE "public"."auth_type" ADD VALUE 'restore_deleted';--> statement-breakpoint
ALTER TYPE "public"."auth_type" ADD VALUE 'restore_and_merge';--> statement-breakpoint
CREATE TABLE "event_ticket" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "event_ticket_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"provider" "ticket_provider" NOT NULL,
	"nullifier" text NOT NULL,
	"event_slug" "event_slug" NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp (0) DEFAULT now() NOT NULL,
	"pcd_type" text,
	"provider_metadata" jsonb,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "zk_passport" DROP CONSTRAINT "zk_passport_nullifier_unique";--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "requires_event_ticket" "event_slug";--> statement-breakpoint
ALTER TABLE "phone" ADD COLUMN "is_deleted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "deleted_at" timestamp (0);--> statement-breakpoint
ALTER TABLE "zk_passport" ADD COLUMN "is_deleted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "event_ticket" ADD CONSTRAINT "event_ticket_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_event_idx" ON "event_ticket" USING btree ("user_id","event_slug");--> statement-breakpoint
CREATE UNIQUE INDEX "event_ticket_nullifier_event_active_unique" ON "event_ticket" USING btree ("nullifier","event_slug") WHERE "event_ticket"."is_deleted" = false;--> statement-breakpoint
CREATE INDEX "nullifier_idx" ON "event_ticket" USING btree ("nullifier");--> statement-breakpoint
CREATE INDEX "conversation_authorId_idx" ON "conversation" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "opinion_authorId_idx" ON "opinion" USING btree ("author_id");--> statement-breakpoint
CREATE UNIQUE INDEX "phone_hash_active_unique" ON "phone" USING btree ("phone_hash") WHERE "phone"."is_deleted" = false;--> statement-breakpoint
CREATE INDEX "phone_hash_idx" ON "phone" USING btree ("phone_hash");--> statement-breakpoint
CREATE INDEX "user_isDeleted_idx" ON "user" USING btree ("is_deleted");--> statement-breakpoint
CREATE INDEX "vote_authorId_idx" ON "vote" USING btree ("author_id");--> statement-breakpoint
CREATE UNIQUE INDEX "zk_passport_nullifier_active_unique" ON "zk_passport" USING btree ("nullifier") WHERE "zk_passport"."is_deleted" = false;--> statement-breakpoint
CREATE INDEX "zk_passport_nullifier_idx" ON "zk_passport" USING btree ("nullifier");