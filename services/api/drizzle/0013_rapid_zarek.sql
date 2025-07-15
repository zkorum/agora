ALTER TYPE "public"."vote_enum" ADD VALUE 'pass';--> statement-breakpoint
ALTER TABLE "opinion" ADD COLUMN "num_passes" integer DEFAULT 0 NOT NULL;