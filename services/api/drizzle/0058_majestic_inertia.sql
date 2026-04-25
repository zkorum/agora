ALTER TABLE IF EXISTS "conversation_proof" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE IF EXISTS "id_proof" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE IF EXISTS "opinion_proof" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE IF EXISTS "vote_proof" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE IF EXISTS "conversation_content" DROP CONSTRAINT IF EXISTS "conversation_content_conversation_proof_id_unique";--> statement-breakpoint
ALTER TABLE IF EXISTS "conversation_content" DROP CONSTRAINT IF EXISTS "conversation_content_conversation_proof_id_conversation_proof_id_fk";--> statement-breakpoint
ALTER TABLE IF EXISTS "device" DROP CONSTRAINT IF EXISTS "device_id_proof_id_id_proof_id_fk";--> statement-breakpoint
ALTER TABLE IF EXISTS "opinion_content" DROP CONSTRAINT IF EXISTS "opinion_content_opinion_proof_id_opinion_proof_id_fk";--> statement-breakpoint
ALTER TABLE IF EXISTS "vote_content" DROP CONSTRAINT IF EXISTS "vote_content_vote_proof_id_vote_proof_id_fk";--> statement-breakpoint
ALTER TABLE IF EXISTS "conversation_content" DROP COLUMN IF EXISTS "conversation_proof_id" CASCADE;--> statement-breakpoint
ALTER TABLE IF EXISTS "device" DROP COLUMN IF EXISTS "id_proof_id" CASCADE;--> statement-breakpoint
ALTER TABLE IF EXISTS "opinion_content" DROP COLUMN IF EXISTS "opinion_proof_id" CASCADE;--> statement-breakpoint
ALTER TABLE IF EXISTS "vote_content" DROP COLUMN IF EXISTS "vote_proof_id" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "conversation_proof" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "id_proof" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "opinion_proof" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "vote_proof" CASCADE;--> statement-breakpoint
DROP TYPE IF EXISTS "public"."proof_type";
