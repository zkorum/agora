UPDATE "device"
SET "session_started_at" = "created_at"
WHERE "session_started_at" IS DISTINCT FROM "created_at";
