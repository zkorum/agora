-- Challenge-response table for Jomhoor wallet 2-step authentication
-- Follows authAttemptPhoneTable pattern: one active challenge per device (did_write as PK)
-- Flow: generate challenge → Jomhoor app submits wallet data → frontend polls for result
CREATE TABLE "wallet_auth_challenge" (
    "did_write" varchar(1000) PRIMARY KEY,
    "challenge" text NOT NULL UNIQUE,
    "wallet_address" text,
    "nationality" varchar(10),
    "status" varchar(20) NOT NULL DEFAULT 'pending',
    "expires_at" timestamp(0) NOT NULL,
    "created_at" timestamp(0) NOT NULL DEFAULT now(),
    "updated_at" timestamp(0) NOT NULL DEFAULT now()
);
