-- Split from V0044 because PostgreSQL requires new enum values to be committed before they can be referenced.
ALTER TABLE "conversation" ALTER COLUMN "participation_mode" SET DEFAULT 'account_required';
