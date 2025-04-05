ALTER TABLE "organisation" RENAME COLUMN "image_name" TO "image_path";--> statement-breakpoint
ALTER TABLE "organisation" ADD COLUMN "is_full_image_path" boolean NOT NULL;