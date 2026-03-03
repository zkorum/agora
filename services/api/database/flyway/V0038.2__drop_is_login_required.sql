-- Drop the old is_login_required column from conversation table
-- All services are now deployed with participation_mode support
ALTER TABLE "conversation" DROP COLUMN IF EXISTS "is_login_required";
