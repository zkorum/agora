-- Deferred: Drop the old is_login_required column from conversation table
-- Move this file to database/flyway/ when all services are deployed with participation_mode support
ALTER TABLE "conversation" DROP COLUMN IF EXISTS "is_login_required";
