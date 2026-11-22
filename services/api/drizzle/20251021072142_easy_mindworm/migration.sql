CREATE TABLE "conversation_update_queue" (
	"conversation_id" integer PRIMARY KEY NOT NULL,
	"requested_at" timestamp (0) DEFAULT now() NOT NULL,
	"processed_at" timestamp (0),
	"last_math_update_at" timestamp (0),
	"created_at" timestamp (0) DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "conversation_math_update_scan_idx";--> statement-breakpoint
ALTER TABLE "conversation_update_queue" ADD CONSTRAINT "conversation_update_queue_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_conversation_update_queue_pending" ON "conversation_update_queue" USING btree ("last_math_update_at") WHERE "conversation_update_queue"."processed_at" IS NULL;--> statement-breakpoint
ALTER TABLE "conversation" DROP COLUMN "needs_math_update";--> statement-breakpoint
ALTER TABLE "conversation" DROP COLUMN "math_update_requested_at";--> statement-breakpoint
ALTER TABLE "conversation" DROP COLUMN "last_math_update_at";