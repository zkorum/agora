CREATE TYPE "public"."export_cancellation_reason_enum" AS ENUM('duplicate_in_batch', 'cooldown_active');--> statement-breakpoint
ALTER TYPE "public"."export_status_enum" ADD VALUE 'cancelled';--> statement-breakpoint
ALTER TYPE "public"."notification_type_enum" ADD VALUE 'export_completed';--> statement-breakpoint
ALTER TYPE "public"."notification_type_enum" ADD VALUE 'export_failed';--> statement-breakpoint
ALTER TYPE "public"."notification_type_enum" ADD VALUE 'export_cancelled';--> statement-breakpoint
CREATE TABLE "notification_export" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "notification_export_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"notification_id" integer NOT NULL,
	"export_id" integer NOT NULL,
	"conversation_id" integer NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversation_export" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation_export" ADD COLUMN "cancellation_reason" "export_cancellation_reason_enum";--> statement-breakpoint
ALTER TABLE "notification_export" ADD CONSTRAINT "notification_export_notification_id_notification_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notification"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_export" ADD CONSTRAINT "notification_export_export_id_conversation_export_id_fk" FOREIGN KEY ("export_id") REFERENCES "public"."conversation_export"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_export" ADD CONSTRAINT "notification_export_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_export" ADD CONSTRAINT "conversation_export_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversation_export_user_idx" ON "conversation_export" USING btree ("user_id");