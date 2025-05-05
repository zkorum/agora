CREATE TABLE "conversation_topic_mapping" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_topic_mapping_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_id" integer NOT NULL,
	"topic_id" integer NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_topic_mapping_unique" UNIQUE("conversation_id","topic_id")
);
--> statement-breakpoint
CREATE TABLE "topic" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "topic_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"score_weight" integer NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "topic_code_unique" UNIQUE("code"),
	CONSTRAINT "topic_name_unique" UNIQUE("name"),
	CONSTRAINT "topic_description_unique" UNIQUE("description")
);
--> statement-breakpoint
CREATE TABLE "user_followed_topic" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_followed_topic_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"topic_id" integer NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "user_followed_topic_unique" UNIQUE("user_id","topic_id")
);
--> statement-breakpoint
DROP TABLE "conversation_topic" CASCADE;--> statement-breakpoint
DROP TABLE "user_conversation_topic_preference" CASCADE;--> statement-breakpoint
ALTER TABLE "conversation_topic_mapping" ADD CONSTRAINT "conversation_topic_mapping_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_topic_mapping" ADD CONSTRAINT "conversation_topic_mapping_topic_id_topic_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topic"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_followed_topic" ADD CONSTRAINT "user_followed_topic_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_followed_topic" ADD CONSTRAINT "user_followed_topic_topic_id_topic_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topic"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversation_topic_mapping_index" ON "conversation_topic_mapping" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "user_followed_topic_index" ON "user_followed_topic" USING btree ("user_id");