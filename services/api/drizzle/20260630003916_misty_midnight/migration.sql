ALTER TABLE "user_display_language_current" RENAME TO "user_display_language";--> statement-breakpoint
ALTER TABLE "user_display_language" DROP CONSTRAINT "user_display_language_current_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "user_display_language" ADD CONSTRAINT "user_display_language_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;