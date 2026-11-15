CREATE TABLE "conversation_project_assignment" (
	"conversation_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"first_assigned_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_project_assignment_project_id_conversation_id_pk" PRIMARY KEY("project_id","conversation_id")
);
--> statement-breakpoint
ALTER TABLE "conversation_project_assignment" ADD CONSTRAINT "conversation_project_assignment_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_project_assignment" ADD CONSTRAINT "conversation_project_assignment_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE no action ON UPDATE no action;