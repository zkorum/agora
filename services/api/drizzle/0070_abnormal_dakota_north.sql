CREATE TYPE "public"."directory_visibility" AS ENUM('listed', 'unlisted');--> statement-breakpoint
CREATE TYPE "public"."organization_membership_all_project_capability_enum" AS ENUM('project_update', 'project_delete', 'project_manage_owner_organizations', 'conversation_create', 'conversation_update', 'conversation_delete', 'conversation_view_private_results', 'conversation_export_owner_data', 'conversation_moderate', 'conversation_manage_integrations');--> statement-breakpoint
CREATE TYPE "public"."organization_membership_capability_enum" AS ENUM('organization_manage_members', 'organization_manage_profile', 'project_create');--> statement-breakpoint
CREATE TABLE "organization_membership_all_project_capability" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "organization_membership_all_project_capability_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_membership_id" integer NOT NULL,
	"capability" "organization_membership_all_project_capability_enum" NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "organization_membership_all_project_capability_unique" UNIQUE("organization_membership_id","capability")
);
--> statement-breakpoint
CREATE TABLE "organization_membership_capability" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "organization_membership_capability_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_membership_id" integer NOT NULL,
	"capability" "organization_membership_capability_enum" NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "organization_membership_capability_unique" UNIQUE("organization_membership_id","capability")
);
--> statement-breakpoint
CREATE TABLE "organization_membership" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "organization_membership_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"organization_id" integer NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "organization_membership_user_organization_unique" UNIQUE("user_id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "project_organization_ownership" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_organization_ownership_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"project_id" integer NOT NULL,
	"organization_id" integer NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "project_organization_ownership_project_org_unique" UNIQUE("project_id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" varchar(65) NOT NULL,
	"display_name" varchar(65) NOT NULL,
	"directory_visibility" "directory_visibility" NOT NULL,
	"auto_provisioned_for_organization_id" integer,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "project_slug_unique" UNIQUE("slug"),
	CONSTRAINT "project_auto_provisioned_for_organization_id_unique" UNIQUE("auto_provisioned_for_organization_id")
);
--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "project_id" integer;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "slug" varchar(65);--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "display_name" varchar(65);--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "directory_visibility" "directory_visibility";--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "auto_provisioned_for_user_id" uuid;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "first_name" varchar(65);--> statement-breakpoint
ALTER TABLE "organization_membership_all_project_capability" ADD CONSTRAINT "organization_membership_all_project_capability_organization_membership_id_organization_membership_id_fk" FOREIGN KEY ("organization_membership_id") REFERENCES "public"."organization_membership"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_membership_capability" ADD CONSTRAINT "organization_membership_capability_organization_membership_id_organization_membership_id_fk" FOREIGN KEY ("organization_membership_id") REFERENCES "public"."organization_membership"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_membership" ADD CONSTRAINT "organization_membership_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_membership" ADD CONSTRAINT "organization_membership_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_organization_ownership" ADD CONSTRAINT "project_organization_ownership_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_organization_ownership" ADD CONSTRAINT "project_organization_ownership_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_auto_provisioned_for_organization_id_organization_id_fk" FOREIGN KEY ("auto_provisioned_for_organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "organization_membership_organization_idx" ON "organization_membership" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "project_organization_ownership_organization_idx" ON "project_organization_ownership" USING btree ("organization_id");--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization" ADD CONSTRAINT "organization_auto_provisioned_for_user_id_user_id_fk" FOREIGN KEY ("auto_provisioned_for_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversation_project_id_idx" ON "conversation" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "conversation_project_timeline_idx" ON "conversation" USING btree ("project_id","is_importing","created_at" DESC,"id" DESC) WHERE "conversation"."current_content_id" is not null;--> statement-breakpoint
ALTER TABLE "organization" ADD CONSTRAINT "organization_slug_unique" UNIQUE("slug");--> statement-breakpoint
ALTER TABLE "organization" ADD CONSTRAINT "organization_auto_provisioned_for_user_id_unique" UNIQUE("auto_provisioned_for_user_id");
