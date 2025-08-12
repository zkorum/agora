CREATE TABLE "user_spoken_languages" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"language_code" varchar(35) NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp (0),
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "user_spoken_languages_unique" UNIQUE("user_id","language_code")
);
--> statement-breakpoint
DROP TABLE "user_language_preference" CASCADE;--> statement-breakpoint
DROP TABLE "user_language" CASCADE;--> statement-breakpoint
ALTER TABLE "user_spoken_languages" ADD CONSTRAINT "user_spoken_languages_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_spoken_languages_user_idx" ON "user_spoken_languages" USING btree ("user_id");