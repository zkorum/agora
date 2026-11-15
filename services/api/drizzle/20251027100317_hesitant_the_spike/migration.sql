CREATE TABLE "polis_cluster_translation" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "polis_cluster_translation_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"polis_cluster_id" integer NOT NULL,
	"language_code" varchar(10) NOT NULL,
	"ai_label" varchar(100),
	"ai_summary" varchar(1000),
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "unique_cluster_language" UNIQUE("polis_cluster_id","language_code")
);
--> statement-breakpoint
ALTER TABLE "polis_cluster_translation" ADD CONSTRAINT "polis_cluster_translation_polis_cluster_id_polis_cluster_id_fk" FOREIGN KEY ("polis_cluster_id") REFERENCES "public"."polis_cluster"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "polis_cluster_translation_lookup_idx" ON "polis_cluster_translation" USING btree ("polis_cluster_id","language_code");