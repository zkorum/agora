CREATE TABLE "user_organization_mapping" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_organization_mapping_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"organization_id" integer NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "unique_user_orgaization_mapping" UNIQUE("user_id","organization_id")
);
--> statement-breakpoint
ALTER TABLE "organisation" RENAME TO "organization";--> statement-breakpoint
ALTER TABLE "organization" RENAME COLUMN "image_url" TO "image_path";--> statement-breakpoint
ALTER TABLE "user" DROP CONSTRAINT "user_organisation_id_organisation_id_fk";
--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "is_full_image_path" boolean NOT NULL;--> statement-breakpoint
ALTER TABLE "user_organization_mapping" ADD CONSTRAINT "user_organization_mapping_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_organization_mapping" ADD CONSTRAINT "user_organization_mapping_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_idx_organization" ON "user_organization_mapping" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "organisation_id";--> statement-breakpoint
ALTER TABLE "organization" ADD CONSTRAINT "organization_name_unique" UNIQUE("name");--> statement-breakpoint
ALTER TABLE "organization" ADD CONSTRAINT "organization_website_url_unique" UNIQUE("website_url");