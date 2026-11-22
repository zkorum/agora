ALTER TYPE "conversation_type" ADD VALUE 'gathering' BEFORE 'polis';--> statement-breakpoint
CREATE TABLE "gathering_answer" (
	"config_id" integer NOT NULL,
	"content_id" integer,
	"field_id" uuid,
	"value" text NOT NULL,
	CONSTRAINT "gathering_answer_pkey" PRIMARY KEY("content_id","field_id"),
	CONSTRAINT "gathering_answer_length_check" CHECK (char_length("value") <= 20000)
);
--> statement-breakpoint
CREATE TABLE "gathering_config" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "gathering_config_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"gathering_mode" text NOT NULL,
	"allow_new_responses" boolean NOT NULL,
	"response_visibility" text NOT NULL,
	CONSTRAINT "gathering_mode_check" CHECK ("gathering_mode" in ('new', 'amend')),
	CONSTRAINT "gathering_visibility_check" CHECK ("response_visibility" in ('everyone', 'facilitators'))
);
--> statement-breakpoint
CREATE TABLE "gathering_field" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"config_id" integer NOT NULL,
	"position" smallint NOT NULL,
	"label" varchar(200) NOT NULL,
	"required" boolean NOT NULL,
	"character_limit" integer NOT NULL,
	CONSTRAINT "gathering_field_config_position_unique" UNIQUE("config_id","position"),
	CONSTRAINT "gathering_field_config_id_unique" UNIQUE("config_id","id"),
	CONSTRAINT "gathering_field_position_check" CHECK ((("position" >= 1) and ("position" <= 6))),
	CONSTRAINT "gathering_field_limit_check" CHECK ((("character_limit" >= 1) and ("character_limit" <= 20000)))
);
--> statement-breakpoint
CREATE TABLE "gathering_moderation" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "gathering_moderation_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"response_id" integer NOT NULL,
	"action" text NOT NULL,
	"moderator_id" uuid,
	"reason" varchar(1000) NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	CONSTRAINT "gathering_moderation_action_check" CHECK ("action" in ('hide', 'move', 'restore'))
);
--> statement-breakpoint
CREATE TABLE "gathering_response_content" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "gathering_response_content_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
	"response_id" integer NOT NULL,
	"config_id" integer NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	CONSTRAINT "gathering_content_response_id_unique" UNIQUE("response_id","id"),
	CONSTRAINT "gathering_content_config_id_unique" UNIQUE("config_id","id")
);
--> statement-breakpoint
CREATE TABLE "gathering_response" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "gathering_response_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug_id" varchar(8) NOT NULL UNIQUE,
	"conversation_id" integer NOT NULL,
	"config_id" integer NOT NULL,
	"author_id" uuid,
	"is_seed" boolean DEFAULT false NOT NULL,
	"current_content_id" integer,
	"baseline_content_id" integer,
	"source_conversation_id" integer,
	"source_response_content_id" integer,
	"source_conversation_slug_id" varchar(8),
	"source_conversation_type" text,
	"moderation" text,
	"account_hidden_at" timestamp(3),
	"deleted_at" timestamp(3),
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	CONSTRAINT "gathering_response_config_id_unique" UNIQUE("config_id","id"),
	CONSTRAINT "gathering_response_seed_author_check" CHECK ((("is_seed" = false) or (("author_id" is null)))),
	CONSTRAINT "gathering_response_moderation_check" CHECK (((("moderation" is null)) or ("moderation" in ('hide', 'move')))),
	CONSTRAINT "gathering_response_provenance_check" CHECK (((((("source_conversation_slug_id" is null)) and (("source_conversation_type" is null)) and (("baseline_content_id" is null)) and (("source_conversation_id" is null)) and (("source_response_content_id" is null)))) or (((("source_conversation_slug_id" is not null)) and ("source_conversation_type" = 'gathering') and (("baseline_content_id" is not null))))))
);
--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "gathering_config_id" integer;--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_gathering_config_unique" UNIQUE("id","gathering_config_id");--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_gathering_config_id_key" UNIQUE("gathering_config_id");--> statement-breakpoint
CREATE INDEX "gathering_moderation_response_idx" ON "gathering_moderation" ("response_id");--> statement-breakpoint
CREATE UNIQUE INDEX "gathering_response_author_unique" ON "gathering_response" ("conversation_id","author_id") WHERE "is_seed" = false;--> statement-breakpoint
CREATE INDEX "gathering_response_author_idx" ON "gathering_response" ("author_id");--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_gathering_config_id_gathering_config_id_fkey" FOREIGN KEY ("gathering_config_id") REFERENCES "gathering_config"("id");--> statement-breakpoint
ALTER TABLE "gathering_answer" ADD CONSTRAINT "gathering_answer_QC8LSTbfId42_fkey" FOREIGN KEY ("config_id","content_id") REFERENCES "gathering_response_content"("config_id","id");--> statement-breakpoint
ALTER TABLE "gathering_answer" ADD CONSTRAINT "gathering_answer_VsQxkBy9VWIK_fkey" FOREIGN KEY ("config_id","field_id") REFERENCES "gathering_field"("config_id","id");--> statement-breakpoint
ALTER TABLE "gathering_field" ADD CONSTRAINT "gathering_field_config_id_gathering_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "gathering_config"("id");--> statement-breakpoint
ALTER TABLE "gathering_moderation" ADD CONSTRAINT "gathering_moderation_response_id_gathering_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "gathering_response"("id");--> statement-breakpoint
ALTER TABLE "gathering_moderation" ADD CONSTRAINT "gathering_moderation_moderator_id_user_id_fkey" FOREIGN KEY ("moderator_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "gathering_response_content" ADD CONSTRAINT "gathering_response_content_fYnutAuIh58h_fkey" FOREIGN KEY ("config_id","response_id") REFERENCES "gathering_response"("config_id","id");--> statement-breakpoint
ALTER TABLE "gathering_response" ADD CONSTRAINT "gathering_response_author_id_user_id_fkey" FOREIGN KEY ("author_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "gathering_response" ADD CONSTRAINT "gathering_response_source_conversation_id_conversation_id_fkey" FOREIGN KEY ("source_conversation_id") REFERENCES "conversation"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "gathering_response" ADD CONSTRAINT "gathering_response_gZoEoHUqVvp3_fkey" FOREIGN KEY ("source_response_content_id") REFERENCES "gathering_response_content"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "gathering_response" ADD CONSTRAINT "gathering_response_Fm8N2oKqOQDJ_fkey" FOREIGN KEY ("conversation_id","config_id") REFERENCES "conversation"("id","gathering_config_id");--> statement-breakpoint
ALTER TABLE "gathering_response" ADD CONSTRAINT "gathering_response_current_fk" FOREIGN KEY ("id","current_content_id") REFERENCES "gathering_response_content"("response_id","id");--> statement-breakpoint
ALTER TABLE "gathering_response" ADD CONSTRAINT "gathering_response_baseline_fk" FOREIGN KEY ("id","baseline_content_id") REFERENCES "gathering_response_content"("response_id","id");--> statement-breakpoint
ALTER TABLE "conversation" DROP CONSTRAINT "conversation_subtype_config_check", ADD CONSTRAINT "conversation_subtype_config_check" CHECK ((((("conversation_type" = 'gathering') and (("gathering_config_id" is not null)) and (("polis_config_id" is null)) and (("ranking_config_id" is null)) and (("credit_voting_config_id" is null)) and (("prioritization_type" is null)))) or (((("gathering_config_id" is null)) and ((((("conversation_type" = 'polis') and (("polis_config_id" is not null)) and (("ranking_config_id" is null)) and (("credit_voting_config_id" is null)) and (("prioritization_type" is null)))) or ((("conversation_type" = 'prioritizing') and (("polis_config_id" is null)) and (("prioritization_type" is not null)) and ((((("prioritization_type" = 'comparisons') and (("ranking_config_id" is not null)) and (("credit_voting_config_id" is null)))) or ((("prioritization_type" = 'qv') and (("credit_voting_config_id" is not null)) and (("ranking_config_id" is null))))))))))))));