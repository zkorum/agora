CREATE TYPE "public"."export_cancellation_reason_enum" AS ENUM('duplicate_in_batch', 'cooldown_active');--> statement-breakpoint
CREATE TYPE "public"."export_file_type_enum" AS ENUM('comments', 'votes', 'participants', 'summary', 'stats');--> statement-breakpoint
CREATE TYPE "public"."export_status_enum" AS ENUM('processing', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."import_method" AS ENUM('url', 'csv');--> statement-breakpoint
CREATE TYPE "public"."import_status_enum" AS ENUM('processing', 'completed', 'failed');--> statement-breakpoint
ALTER TYPE "public"."notification_type_enum" ADD VALUE 'export_started';--> statement-breakpoint
ALTER TYPE "public"."notification_type_enum" ADD VALUE 'export_completed';--> statement-breakpoint
ALTER TYPE "public"."notification_type_enum" ADD VALUE 'export_failed';--> statement-breakpoint
ALTER TYPE "public"."notification_type_enum" ADD VALUE 'export_cancelled';--> statement-breakpoint
ALTER TYPE "public"."notification_type_enum" ADD VALUE 'import_started';--> statement-breakpoint
ALTER TYPE "public"."notification_type_enum" ADD VALUE 'import_completed';--> statement-breakpoint
ALTER TYPE "public"."notification_type_enum" ADD VALUE 'import_failed';--> statement-breakpoint
CREATE TABLE "conversation_export_file" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_export_file_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"export_id" integer NOT NULL,
	"file_type" "export_file_type_enum" NOT NULL,
	"file_name" varchar(100) NOT NULL,
	"file_size" integer NOT NULL,
	"record_count" integer NOT NULL,
	"s3_key" text NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation_export" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_export_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug_id" varchar(8) NOT NULL,
	"conversation_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "export_status_enum" DEFAULT 'processing' NOT NULL,
	"total_file_size" integer,
	"total_file_count" integer,
	"error_message" text,
	"cancellation_reason" "export_cancellation_reason_enum",
	"expires_at" timestamp (0) NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp (0),
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_export_slug_id_unique" UNIQUE("slug_id")
);
--> statement-breakpoint
CREATE TABLE "conversation_import" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_import_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug_id" varchar(8) NOT NULL,
	"conversation_id" integer,
	"user_id" uuid NOT NULL,
	"status" "import_status_enum" DEFAULT 'processing' NOT NULL,
	"error_message" text,
	"csv_file_metadata" jsonb,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_import_slug_id_unique" UNIQUE("slug_id")
);
--> statement-breakpoint
CREATE TABLE "notification_export" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "notification_export_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"notification_id" integer NOT NULL,
	"export_id" integer NOT NULL,
	"conversation_id" integer NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_import" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "notification_import_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"notification_id" integer NOT NULL,
	"import_id" integer NOT NULL,
	"conversation_id" integer,
	"created_at" timestamp (0) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "import_method" "import_method" DEFAULT 'url';--> statement-breakpoint
ALTER TABLE "conversation_export_file" ADD CONSTRAINT "conversation_export_file_export_id_conversation_export_id_fk" FOREIGN KEY ("export_id") REFERENCES "public"."conversation_export"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_export" ADD CONSTRAINT "conversation_export_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_export" ADD CONSTRAINT "conversation_export_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_import" ADD CONSTRAINT "conversation_import_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_import" ADD CONSTRAINT "conversation_import_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_export" ADD CONSTRAINT "notification_export_notification_id_notification_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notification"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_export" ADD CONSTRAINT "notification_export_export_id_conversation_export_id_fk" FOREIGN KEY ("export_id") REFERENCES "public"."conversation_export"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_export" ADD CONSTRAINT "notification_export_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_import" ADD CONSTRAINT "notification_import_notification_id_notification_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notification"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_import" ADD CONSTRAINT "notification_import_import_id_conversation_import_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."conversation_import"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_import" ADD CONSTRAINT "notification_import_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversation_export_file_export_idx" ON "conversation_export_file" USING btree ("export_id");--> statement-breakpoint
CREATE INDEX "conversation_export_file_type_idx" ON "conversation_export_file" USING btree ("file_type");--> statement-breakpoint
CREATE INDEX "conversation_export_conversation_idx" ON "conversation_export" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "conversation_export_status_idx" ON "conversation_export" USING btree ("status");--> statement-breakpoint
CREATE INDEX "conversation_export_deleted_idx" ON "conversation_export" USING btree ("is_deleted");--> statement-breakpoint
CREATE INDEX "conversation_export_created_idx" ON "conversation_export" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "conversation_export_user_idx" ON "conversation_export" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "conversation_import_status_idx" ON "conversation_import" USING btree ("status");--> statement-breakpoint
CREATE INDEX "conversation_import_created_idx" ON "conversation_import" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "conversation_import_user_idx" ON "conversation_import" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "conversation_import_conversation_idx" ON "conversation_import" USING btree ("conversation_id");