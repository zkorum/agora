-- Add wallet table for Jomhoor wallet-based authentication
-- Mirrors the pattern of zk_passport table
CREATE TABLE "wallet" (
    "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    "user_id" uuid NOT NULL REFERENCES "user"("id"),
    "wallet_address" text NOT NULL,
    "nationality" varchar(10) NOT NULL,
    "is_deleted" boolean NOT NULL DEFAULT false,
    "created_at" timestamp(0) NOT NULL DEFAULT now(),
    "updated_at" timestamp(0) NOT NULL DEFAULT now()
);

-- Partial unique index: wallet_address must be unique among non-deleted users only
CREATE UNIQUE INDEX "wallet_address_active_unique" ON "wallet" ("wallet_address") WHERE "is_deleted" = false;

-- Regular index for wallet address lookups
CREATE INDEX "wallet_address_idx" ON "wallet" ("wallet_address");
