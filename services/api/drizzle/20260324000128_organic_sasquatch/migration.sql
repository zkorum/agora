DROP INDEX "maxdiff_external_source_dedup_idx";--> statement-breakpoint
CREATE INDEX "maxdiff_external_source_external_id_idx" ON "maxdiff_item_external_source" USING btree ("external_id");