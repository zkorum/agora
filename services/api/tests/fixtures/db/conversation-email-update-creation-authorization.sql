-- WARNING: GENERATED FROM services/shared-backend/src/schema.ts. DO NOT EDIT.
-- Regenerate with: make sync-api-test-db-fixtures

CREATE TYPE "public"."directory_visibility" AS ENUM('listed', 'unlisted');

CREATE TYPE "public"."display_language_code" AS ENUM('en', 'es', 'fr', 'zh-Hant', 'zh-Hans', 'ja', 'ar', 'fa', 'he', 'ky', 'ru');

CREATE TYPE "public"."organization_membership_all_project_capability_enum" AS ENUM('project_update', 'project_delete', 'project_manage_owner_organizations', 'conversation_create', 'conversation_edit', 'conversation_delete', 'conversation_view_private_results', 'conversation_export_owner_data', 'conversation_moderate', 'conversation_manage_integrations', 'conversation_email_update');

CREATE TYPE "public"."organization_role" AS ENUM('admin', 'manager', 'moderator');

CREATE TYPE "public"."premium_feature" AS ENUM('survey', 'event_ticket', 'analysis_variants', 'dynamic_translation', 'conversation_email_update');

CREATE TABLE "organization_membership_all_project_capability" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "organization_membership_all_project_capability_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_membership_id" integer NOT NULL,
	"capability" "organization_membership_all_project_capability_enum" NOT NULL,
	"granted_by_user_id" uuid,
	"revoked_by_user_id" uuid,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp (0),
	CONSTRAINT "organization_membership_all_project_capability_revocation_check" CHECK (("organization_membership_all_project_capability"."revoked_by_user_id" is null or "organization_membership_all_project_capability"."deleted_at" is not null))
);

CREATE TABLE "organization_membership" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "organization_membership_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"organization_id" integer NOT NULL,
	"role" "organization_role" NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp (0)
);

CREATE TABLE "organization" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "organization_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" varchar(65) NOT NULL,
	"display_name" varchar(65) NOT NULL,
	"default_language_code" "display_language_code" NOT NULL,
	"directory_visibility" "directory_visibility" NOT NULL,
	"auto_provisioned_for_user_id" uuid,
	"image_path" text,
	"is_full_image_path" boolean NOT NULL,
	"website_url" text,
	"description" varchar(280),
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp (0),
	"retired_for_account_deletion_at" timestamp (3),
	CONSTRAINT "organization_auto_provisioned_for_user_id_unique" UNIQUE("auto_provisioned_for_user_id"),
	CONSTRAINT "organization_account_retirement_check" CHECK (("organization"."retired_for_account_deletion_at" is null or ("organization"."auto_provisioned_for_user_id" is not null and "organization"."deleted_at" is not null and "organization"."deleted_at" = "organization"."retired_for_account_deletion_at"::timestamp(0))))
);

CREATE TABLE "premium_feature_entitlement" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "premium_feature_entitlement_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"feature" "premium_feature" NOT NULL,
	"starts_at" timestamp (0) NOT NULL,
	"expires_at" timestamp (0),
	"revoked_at" timestamp (0),
	"admin_note" text,
	"created_by_user_id" uuid,
	"updated_by_user_id" uuid,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "premium_feature_entitlement_organization_id_id_unique" UNIQUE("organization_id","id")
);

CREATE TABLE "project_contact" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_contact_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"project_id" integer NOT NULL,
	"first_name" varchar(65),
	"last_name" varchar(65),
	"role_label" varchar(150),
	"email" text,
	"website_url" text,
	"image_path" text,
	"is_full_image_path" boolean DEFAULT false NOT NULL,
	"organization_id" integer,
	"external_organization_id" integer,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp (0),
	CONSTRAINT "project_contact_name_or_affiliation_check" CHECK ((("project_contact"."first_name" is not null and "project_contact"."first_name" ~ U&'[^\0009-\000d \00a0\1680\2000-\200a\2028\2029\202f\205f\3000\feff]') or ("project_contact"."last_name" is not null and "project_contact"."last_name" ~ U&'[^\0009-\000d \00a0\1680\2000-\200a\2028\2029\202f\205f\3000\feff]') or "project_contact"."organization_id" is not null)),
	CONSTRAINT "project_contact_affiliation_source_check" CHECK (num_nonnulls("project_contact"."organization_id", "project_contact"."external_organization_id") <= 1),
	CONSTRAINT "project_contact_email_or_website_check" CHECK ((("project_contact"."email" is not null and "project_contact"."email" ~ U&'[^\0009-\000d \00a0\1680\2000-\200a\2028\2029\202f\205f\3000\feff]') or ("project_contact"."website_url" is not null and "project_contact"."website_url" ~ U&'[^\0009-\000d \00a0\1680\2000-\200a\2028\2029\202f\205f\3000\feff]')))
);

CREATE TABLE "project_organization_ownership" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_organization_ownership_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"project_id" integer NOT NULL,
	"organization_id" integer NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp (0)
);

CREATE TABLE "project" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" varchar(65) NOT NULL,
	"title" varchar(150) NOT NULL,
	"directory_visibility" "directory_visibility" NOT NULL,
	"auto_provisioned_for_organization_id" integer,
	"current_content_id" integer,
	"dynamic_translation_enabled" boolean DEFAULT false NOT NULL,
	"conversation_email_update_default_enabled" boolean DEFAULT false NOT NULL,
	"conversation_email_update_default_updated_at" timestamp (0),
	"conversation_email_update_default_updated_by_user_id" uuid,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp (0),
	"retired_for_account_deletion_at" timestamp (3),
	CONSTRAINT "project_current_content_id_unique" UNIQUE("current_content_id"),
	CONSTRAINT "project_account_retirement_check" CHECK (("project"."retired_for_account_deletion_at" is null or ("project"."auto_provisioned_for_organization_id" is not null and "project"."deleted_at" is not null and "project"."deleted_at" = "project"."retired_for_account_deletion_at"::timestamp(0)))),
	CONSTRAINT "project_email_update_default_audit_check" CHECK (("project"."conversation_email_update_default_updated_by_user_id" is null or "project"."conversation_email_update_default_updated_at" is not null))
);

CREATE TABLE "user" (
	"id" uuid PRIMARY KEY NOT NULL,
	"polis_participant_id" serial NOT NULL,
	"username" varchar(20) NOT NULL,
	"is_site_moderator" boolean DEFAULT false NOT NULL,
	"is_site_org_admin" boolean DEFAULT false NOT NULL,
	"is_imported" boolean DEFAULT false NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"contribution_revision" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp (0),
	"deletion_reason" text,
	"deletion_requested_at" timestamp (3),
	"recoverable_until" timestamp (3),
	"purge_started_at" timestamp (3),
	"auth_restricted_at" timestamp (0),
	"auth_restriction_reason" text,
	"active_conversation_count" integer DEFAULT 0 NOT NULL,
	"total_conversation_count" integer DEFAULT 0 NOT NULL,
	"total_opinion_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "user_username_unique" UNIQUE("username"),
	CONSTRAINT "user_contribution_revision_check" CHECK ("user"."contribution_revision" >= 0),
	CONSTRAINT "user_recovery_lifecycle_check" CHECK (((("user"."deletion_requested_at" is null and "user"."recoverable_until" is null) or ("user"."is_deleted" = true and "user"."deletion_reason" is not null and "user"."deletion_reason" = 'account_deletion' and "user"."deletion_requested_at" is not null and "user"."recoverable_until" is not null and "user"."recoverable_until" = "user"."deletion_requested_at" + interval '15 days')) and ("user"."purge_started_at" is null or "user"."is_deleted" = true))),
	CONSTRAINT "user_auth_restriction_reason_check" CHECK (("user"."auth_restricted_at" IS NULL) = ("user"."auth_restriction_reason" IS NULL)),
	CONSTRAINT "user_deletion_reason_check" CHECK (("user"."deletion_reason" is null or ("user"."is_deleted" = true and "user"."deleted_at" is not null and "user"."deletion_reason" in ('account_deletion', 'guest_merge'))))
);

CREATE UNIQUE INDEX "organization_membership_all_project_capability_active_unique" ON "organization_membership_all_project_capability" USING btree ("organization_membership_id","capability") WHERE "organization_membership_all_project_capability"."deleted_at" is null;

CREATE UNIQUE INDEX "organization_membership_active_unique" ON "organization_membership" USING btree ("user_id","organization_id") WHERE "organization_membership"."deleted_at" is null;

CREATE INDEX "organization_membership_organization_idx" ON "organization_membership" USING btree ("organization_id");

CREATE INDEX "organization_membership_active_admin_idx" ON "organization_membership" USING btree ("organization_id","user_id") WHERE ("organization_membership"."deleted_at" is null and "organization_membership"."role" = 'admin');

CREATE UNIQUE INDEX "organization_active_slug_unique" ON "organization" USING btree ("slug") WHERE "organization"."deleted_at" IS NULL;

CREATE INDEX "premium_feature_entitlement_org_idx" ON "premium_feature_entitlement" USING btree ("organization_id","feature");

CREATE UNIQUE INDEX "project_contact_project_active_unique" ON "project_contact" USING btree ("project_id") WHERE "project_contact"."deleted_at" is null;

CREATE INDEX "project_contact_organization_idx" ON "project_contact" USING btree ("organization_id") WHERE "project_contact"."organization_id" is not null;

CREATE UNIQUE INDEX "project_organization_ownership_active_unique" ON "project_organization_ownership" USING btree ("project_id","organization_id") WHERE "project_organization_ownership"."deleted_at" is null;

CREATE INDEX "project_organization_ownership_organization_idx" ON "project_organization_ownership" USING btree ("organization_id");

CREATE UNIQUE INDEX "project_active_slug_unique" ON "project" USING btree ("slug") WHERE "project"."deleted_at" is null;

CREATE UNIQUE INDEX "project_active_default_organization_unique" ON "project" USING btree ("auto_provisioned_for_organization_id") WHERE "project"."deleted_at" is null;
