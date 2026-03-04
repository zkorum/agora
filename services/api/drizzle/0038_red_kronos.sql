ALTER TABLE "user" RENAME COLUMN "is_moderator" TO "is_site_moderator";--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "is_site_org_admin" boolean DEFAULT false NOT NULL;