CREATE TABLE "realtime_event_outbox" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "realtime_event_outbox_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"event_type" varchar(100) NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "realtime_event_outbox_created_at_idx" ON "realtime_event_outbox" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "realtime_event_outbox_event_type_created_at_idx" ON "realtime_event_outbox" USING btree ("event_type","created_at");