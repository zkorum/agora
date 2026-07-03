ALTER TABLE "project_contact" RENAME COLUMN "name" TO "first_name";--> statement-breakpoint
ALTER TABLE "project_contact" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "project_contact" ADD COLUMN "last_name" varchar(65);--> statement-breakpoint
ALTER TABLE "project_contact" ADD COLUMN "website_url" text;--> statement-breakpoint
ALTER TABLE "project_contact" ADD COLUMN "image_path" text;--> statement-breakpoint
ALTER TABLE "project_contact" ADD COLUMN "is_full_image_path" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "project_contact" ADD CONSTRAINT "project_contact_email_or_website_check" CHECK (num_nonnulls("project_contact"."email", "project_contact"."website_url") >= 1);