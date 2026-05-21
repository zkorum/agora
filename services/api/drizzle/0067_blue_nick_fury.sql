CREATE TABLE "opinion_group_description_translation_work" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "opinion_group_description_translation_work_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"description_id" integer NOT NULL,
	"conversation_id" integer NOT NULL,
	"locale" varchar(10) NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_run_at" timestamp (0),
	"lease_owner" varchar(100),
	"lease_token" varchar(100),
	"lease_expires_at" timestamp (0),
	"non_retryable_ai_description_epoch" integer,
	"last_error_code" varchar(100),
	"last_error_message" text,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "opinion_group_description_translation_work_unique" UNIQUE("description_id","locale"),
	CONSTRAINT "opinion_group_description_translation_work_running_lease_check" CHECK ((("opinion_group_description_translation_work"."lease_owner" is null AND "opinion_group_description_translation_work"."lease_token" is null AND "opinion_group_description_translation_work"."lease_expires_at" is null) OR ("opinion_group_description_translation_work"."lease_owner" is not null AND "opinion_group_description_translation_work"."lease_token" is not null AND "opinion_group_description_translation_work"."lease_expires_at" is not null)))
);
--> statement-breakpoint
CREATE TABLE "opinion_group_lineage_description_work" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "opinion_group_lineage_description_work_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"lineage_id" integer NOT NULL,
	"conversation_id" integer NOT NULL,
	"source_candidate_id" integer NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_run_at" timestamp (0),
	"lease_owner" varchar(100),
	"lease_token" varchar(100),
	"lease_expires_at" timestamp (0),
	"non_retryable_ai_description_epoch" integer,
	"last_error_code" varchar(100),
	"last_error_message" text,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "opinion_group_lineage_description_work_unique" UNIQUE("lineage_id"),
	CONSTRAINT "opinion_group_lineage_description_work_running_lease_check" CHECK ((("opinion_group_lineage_description_work"."lease_owner" is null AND "opinion_group_lineage_description_work"."lease_token" is null AND "opinion_group_lineage_description_work"."lease_expires_at" is null) OR ("opinion_group_lineage_description_work"."lease_owner" is not null AND "opinion_group_lineage_description_work"."lease_token" is not null AND "opinion_group_lineage_description_work"."lease_expires_at" is not null)))
);
--> statement-breakpoint
ALTER TABLE "opinion_group_description_translation_work" ADD CONSTRAINT "opinion_group_description_translation_work_description_id_opinion_group_description_id_fk" FOREIGN KEY ("description_id") REFERENCES "public"."opinion_group_description"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opinion_group_description_translation_work" ADD CONSTRAINT "opinion_group_description_translation_work_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opinion_group_lineage_description_work" ADD CONSTRAINT "opinion_group_lineage_description_work_lineage_id_opinion_group_lineage_id_fk" FOREIGN KEY ("lineage_id") REFERENCES "public"."opinion_group_lineage"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opinion_group_lineage_description_work" ADD CONSTRAINT "opinion_group_lineage_description_work_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opinion_group_lineage_description_work" ADD CONSTRAINT "opinion_group_lineage_description_work_source_candidate_id_opinion_group_candidate_id_fk" FOREIGN KEY ("source_candidate_id") REFERENCES "public"."opinion_group_candidate"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "opinion_group_description_translation_work_due_idx" ON "opinion_group_description_translation_work" USING btree ("next_run_at") WHERE ("opinion_group_description_translation_work"."lease_token" is null AND "opinion_group_description_translation_work"."next_run_at" is not null);--> statement-breakpoint
CREATE INDEX "opinion_group_lineage_description_work_due_idx" ON "opinion_group_lineage_description_work" USING btree ("next_run_at") WHERE ("opinion_group_lineage_description_work"."lease_token" is null AND "opinion_group_lineage_description_work"."next_run_at" is not null);