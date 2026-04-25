ALTER TABLE "conversation_proof" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "id_proof" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "opinion_proof" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "vote_proof" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "conversation_proof" CASCADE;--> statement-breakpoint
DROP TABLE "id_proof" CASCADE;--> statement-breakpoint
DROP TABLE "opinion_proof" CASCADE;--> statement-breakpoint
DROP TABLE "vote_proof" CASCADE;--> statement-breakpoint
ALTER TABLE "conversation_content" DROP CONSTRAINT "conversation_content_conversation_proof_id_unique";--> statement-breakpoint
ALTER TABLE "conversation_content" DROP CONSTRAINT "conversation_content_conversation_proof_id_conversation_proof_id_fk";
--> statement-breakpoint
ALTER TABLE "device" DROP CONSTRAINT "device_id_proof_id_id_proof_id_fk";
--> statement-breakpoint
ALTER TABLE "opinion_content" DROP CONSTRAINT "opinion_content_opinion_proof_id_opinion_proof_id_fk";
--> statement-breakpoint
ALTER TABLE "vote_content" DROP CONSTRAINT "vote_content_vote_proof_id_vote_proof_id_fk";
--> statement-breakpoint
ALTER TABLE "conversation_content" DROP COLUMN "conversation_proof_id";--> statement-breakpoint
ALTER TABLE "device" DROP COLUMN "id_proof_id";--> statement-breakpoint
ALTER TABLE "opinion_content" DROP COLUMN "opinion_proof_id";--> statement-breakpoint
ALTER TABLE "vote_content" DROP COLUMN "vote_proof_id";--> statement-breakpoint
DROP TYPE "public"."proof_type";