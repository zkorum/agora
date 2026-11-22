CREATE TABLE "analysis_input_participant_eligibility" (
	"input_snapshot_id" integer,
	"participant_index" integer,
	"user_id" uuid,
	"is_account_hidden" boolean DEFAULT false NOT NULL,
	CONSTRAINT "analysis_input_participant_eligibility_pkey" PRIMARY KEY("input_snapshot_id","participant_index"),
	CONSTRAINT "analysis_input_participant_eligibility_account_unique" UNIQUE("input_snapshot_id","user_id"),
	CONSTRAINT "analysis_input_participant_eligibility_index_check" CHECK ("participant_index" >= 0),
	CONSTRAINT "analysis_input_participant_eligibility_detached_check" CHECK (((("user_id" is not null)) or ("is_account_hidden" = true)))
);
--> statement-breakpoint
CREATE TABLE "qv_input_ballot_eligibility" (
	"snapshot_id" uuid,
	"ballot_index" integer,
	"user_id" uuid,
	"is_account_hidden" boolean DEFAULT false NOT NULL,
	CONSTRAINT "qv_input_ballot_eligibility_pkey" PRIMARY KEY("snapshot_id","ballot_index"),
	CONSTRAINT "qv_input_ballot_eligibility_account_unique" UNIQUE("snapshot_id","user_id"),
	CONSTRAINT "qv_input_ballot_eligibility_detached_check" CHECK (((("user_id" is not null)) or ("is_account_hidden" = true)))
);
--> statement-breakpoint
CREATE TABLE "ranking_input_participant_eligibility" (
	"input_snapshot_id" uuid,
	"participant_index" integer,
	"user_id" uuid,
	"is_account_hidden" boolean DEFAULT false NOT NULL,
	CONSTRAINT "ranking_input_participant_eligibility_pkey" PRIMARY KEY("input_snapshot_id","participant_index"),
	CONSTRAINT "ranking_input_participant_eligibility_account_unique" UNIQUE("input_snapshot_id","user_id"),
	CONSTRAINT "ranking_input_participant_eligibility_detached_check" CHECK (((("user_id" is not null)) or ("is_account_hidden" = true)))
);
--> statement-breakpoint
ALTER TABLE "opinion" ADD COLUMN "account_hidden_content_retained" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ranking_conversation_stats_snapshot" ADD COLUMN "reused_input_snapshot_id" uuid;--> statement-breakpoint
ALTER TABLE "ranking_item" ADD COLUMN "account_hidden_content_retained" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ranking_input_snapshot" ADD CONSTRAINT "ranking_input_id_conversation_unique" UNIQUE("id","conversation_id");--> statement-breakpoint
CREATE INDEX "analysis_input_participant_eligibility_user_idx" ON "analysis_input_participant_eligibility" ("user_id");--> statement-breakpoint
CREATE INDEX "qv_input_ballot_eligibility_user_idx" ON "qv_input_ballot_eligibility" ("user_id");--> statement-breakpoint
CREATE INDEX "ranking_stats_reused_input_idx" ON "ranking_conversation_stats_snapshot" ("reused_input_snapshot_id") WHERE ("reused_input_snapshot_id" is not null);--> statement-breakpoint
CREATE INDEX "ranking_input_participant_eligibility_user_idx" ON "ranking_input_participant_eligibility" ("user_id");--> statement-breakpoint
ALTER TABLE "analysis_input_participant_eligibility" ADD CONSTRAINT "analysis_input_participant_eligibility_0WTJjkIS5wfK_fkey" FOREIGN KEY ("input_snapshot_id") REFERENCES "analysis_input_snapshot"("id");--> statement-breakpoint
ALTER TABLE "analysis_input_participant_eligibility" ADD CONSTRAINT "analysis_input_participant_eligibility_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "qv_input_ballot_eligibility" ADD CONSTRAINT "qv_input_ballot_eligibility_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "qv_input_ballot_eligibility" ADD CONSTRAINT "qv_input_ballot_eligibility_ballot_fk" FOREIGN KEY ("snapshot_id","ballot_index") REFERENCES "qv_input_ballot"("snapshot_id","ballot_index");--> statement-breakpoint
ALTER TABLE "ranking_conversation_stats_snapshot" ADD CONSTRAINT "ranking_stats_reused_input_conversation_fk" FOREIGN KEY ("reused_input_snapshot_id","conversation_id") REFERENCES "ranking_input_snapshot"("id","conversation_id");--> statement-breakpoint
ALTER TABLE "ranking_input_participant_eligibility" ADD CONSTRAINT "ranking_input_participant_eligibility_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "ranking_input_participant_eligibility" ADD CONSTRAINT "ranking_input_participant_eligibility_participant_fk" FOREIGN KEY ("input_snapshot_id","participant_index") REFERENCES "ranking_input_participant"("input_snapshot_id","participant_index");--> statement-breakpoint
ALTER TABLE "ranking_conversation_stats_snapshot" ADD CONSTRAINT "ranking_stats_reused_input_closed_check" CHECK (((("reused_input_snapshot_id" is null)) or ("is_closed" = true)));