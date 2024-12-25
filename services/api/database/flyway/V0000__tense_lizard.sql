CREATE TYPE "public"."auth_type" AS ENUM('register', 'login_known_device', 'login_new_device');--> statement-breakpoint
CREATE TYPE "public"."email_type" AS ENUM('primary', 'backup', 'secondary', 'other');--> statement-breakpoint
CREATE TYPE "public"."moderation_action" AS ENUM('lock', 'hide', 'nothing');--> statement-breakpoint
CREATE TYPE "public"."moderation_reason_enum" AS ENUM('off-topic', 'spam', 'misleading', 'privacy', 'sexual', 'toxic', 'illegal', 'nothing');--> statement-breakpoint
CREATE TYPE "public"."phone_country_code" AS ENUM('AC', 'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AR', 'AS', 'AT', 'AU', 'AW', 'AX', 'AZ', 'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS', 'BT', 'BW', 'BY', 'BZ', 'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN', 'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ', 'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK', 'FM', 'FO', 'FR', 'GA', 'GB', 'GD', 'GE', 'GF', 'GG', 'GH', 'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GT', 'GU', 'GW', 'GY', 'HK', 'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR', 'IS', 'IT', 'JE', 'JM', 'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK', 'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ', 'NA', 'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NU', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM', 'PR', 'PS', 'PT', 'PW', 'PY', 'QA', 'RE', 'RO', 'RS', 'RU', 'RW', 'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SX', 'SY', 'SZ', 'TA', 'TC', 'TD', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW', 'TZ', 'UA', 'UG', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VI', 'VN', 'VU', 'WF', 'WS', 'XK', 'YE', 'YT', 'ZA', 'ZM', 'ZW');--> statement-breakpoint
CREATE TYPE "public"."proof_type" AS ENUM('creation', 'edit', 'deletion');--> statement-breakpoint
CREATE TYPE "public"."report_reason_enum" AS ENUM('off-topic', 'spam', 'misleading', 'privacy', 'sexual', 'toxic', 'illegal');--> statement-breakpoint
CREATE TYPE "public"."sex" AS ENUM('F', 'M', 'X');--> statement-breakpoint
CREATE TYPE "public"."vote_enum" AS ENUM('like', 'dislike');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth_attempt_phone" (
	"did_write" varchar(1000) PRIMARY KEY NOT NULL,
	"type" "auth_type" NOT NULL,
	"last_two_digits" varchar(2) NOT NULL,
	"countryCallingCode" varchar(10) NOT NULL,
	"phone_country_code" "phone_country_code",
	"phone_hash" text NOT NULL,
	"pepper_version" integer DEFAULT 0 NOT NULL,
	"user_id" uuid NOT NULL,
	"user_agent" text NOT NULL,
	"code" integer NOT NULL,
	"code_expiry" timestamp NOT NULL,
	"guess_attempt_amount" integer DEFAULT 0 NOT NULL,
	"last_otp_sent_at" timestamp NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "comment_content" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "comment_content_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"comment_id" integer NOT NULL,
	"post_content_id" integer NOT NULL,
	"comment_proof_id" integer NOT NULL,
	"parent_id" integer,
	"content" varchar NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "comment_proof" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "comment_proof_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"proof_type" "proof_type" NOT NULL,
	"comment_id" integer NOT NULL,
	"parent_id" integer,
	"author_did" varchar(1000) NOT NULL,
	"proof" text NOT NULL,
	"proof_version" integer NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "comment" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "comment_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug_id" varchar(8) NOT NULL,
	"author_id" uuid NOT NULL,
	"post_id" integer NOT NULL,
	"current_content_id" integer,
	"num_likes" integer DEFAULT 0 NOT NULL,
	"num_dislikes" integer DEFAULT 0 NOT NULL,
	"is_hidden" boolean DEFAULT false NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	"last_reacted_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "comment_slug_id_unique" UNIQUE("slug_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "device" (
	"did_write" varchar(1000) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"id_proof_id" integer,
	"user_agent" text NOT NULL,
	"session_expiry" timestamp NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email" (
	"email" varchar(254) PRIMARY KEY NOT NULL,
	"type" "email_type" NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "id_proof" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "id_proof_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"proof_type" "proof_type" NOT NULL,
	"proof" text NOT NULL,
	"proof_version" integer NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "moderation_table" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "moderation_table_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"report_id" integer,
	"moderator_id" uuid,
	"moderation_action" "moderation_action" NOT NULL,
	"moderation_reason" "moderation_reason_enum" NOT NULL,
	"moderation_explanation" varchar(260),
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organisation" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "organisation_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(65) NOT NULL,
	"image_url" text,
	"website_url" text,
	"description" varchar(280),
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "passport" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "passport_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"citizenship" varchar(10) NOT NULL,
	"nullifier" text NOT NULL,
	"sex" varchar(50) NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "passport_nullifier_unique" UNIQUE("nullifier")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "phone" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "phone_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"last_two_digits" varchar(2) NOT NULL,
	"countryCallingCode" varchar(10) NOT NULL,
	"phone_country_code" "phone_country_code",
	"phone_hash" text NOT NULL,
	"pepper_version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "poll_response_content" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "poll_response_content_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"poll_response_id" integer NOT NULL,
	"poll_response_proof_id" integer NOT NULL,
	"post_content_id" integer NOT NULL,
	"parent_id" integer,
	"option_chosen" integer NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "poll_response_content_poll_response_proof_id_unique" UNIQUE("poll_response_proof_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "poll_response_proof" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "poll_response_proof_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"proof_type" "proof_type" NOT NULL,
	"post_id" integer NOT NULL,
	"parent_id" integer,
	"author_did" varchar(1000) NOT NULL,
	"proof" text NOT NULL,
	"proof_version" integer NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "poll_response" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "poll_response_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"author_id" uuid NOT NULL,
	"post_id" integer NOT NULL,
	"current_content_id" integer,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "poll_response_current_content_id_unique" UNIQUE("current_content_id"),
	CONSTRAINT "poll_response_author_id_post_id_unique" UNIQUE("author_id","post_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "poll" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "poll_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"post_content_id" integer NOT NULL,
	"option1" varchar(30) NOT NULL,
	"option2" varchar(30) NOT NULL,
	"option3" varchar(30),
	"option4" varchar(30),
	"option5" varchar(30),
	"option6" varchar(30),
	"option1_response" integer DEFAULT 0 NOT NULL,
	"option2_response" integer DEFAULT 0 NOT NULL,
	"option3_response" integer,
	"option4_response" integer,
	"option5_response" integer,
	"option6_response" integer,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "poll_post_content_id_unique" UNIQUE("post_content_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "post_content" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "post_content_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"post_id" integer NOT NULL,
	"post_proof_id" integer NOT NULL,
	"parent_id" integer,
	"title" varchar(130) NOT NULL,
	"body" varchar,
	"poll_id" integer,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "post_content_post_proof_id_unique" UNIQUE("post_proof_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "post_proof" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "post_proof_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"proof_type" "proof_type" NOT NULL,
	"post_id" integer NOT NULL,
	"parent_id" integer,
	"author_did" varchar(1000) NOT NULL,
	"proof" text NOT NULL,
	"proof_version" integer NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "post" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "post_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug_id" varchar(8) NOT NULL,
	"author_id" uuid NOT NULL,
	"current_content_id" integer,
	"is_hidden" boolean DEFAULT false NOT NULL,
	"is_locked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	"last_reacted_at" timestamp (0) DEFAULT now() NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "post_slug_id_unique" UNIQUE("slug_id"),
	CONSTRAINT "post_current_content_id_unique" UNIQUE("current_content_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "post_topic" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "post_topic_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text,
	"code" text,
	"created_at" timestamp (0) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "report_table" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "report_table_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"post_id" integer,
	"comment_id" integer,
	"reporter_id" uuid,
	"reporter_reason" "report_reason_enum",
	"report_explanation" varchar(260),
	"moderation_id" integer,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_language_preference" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_language_preference_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"lang_id" integer NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "user_unique_language" UNIQUE("user_id","lang_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_language" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_language_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text,
	"code" text,
	"created_at" timestamp (0) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_post_topic_preference" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_post_topic_preference_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"post_tag_id" integer NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "user_unique_topic" UNIQUE("user_id","post_tag_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organisation_id" integer,
	"username" varchar(40) NOT NULL,
	"is_moderator" boolean DEFAULT false NOT NULL,
	"is_anonymous" boolean DEFAULT true NOT NULL,
	"show_flagged_content" boolean DEFAULT false NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"active_post_count" integer DEFAULT 0 NOT NULL,
	"total_post_count" integer DEFAULT 0 NOT NULL,
	"total_comment_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "user_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vote_content" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "vote_content_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"vote_id" integer NOT NULL,
	"vote_proof_id" integer NOT NULL,
	"comment_content_id" integer NOT NULL,
	"option_chosen" "vote_enum" NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vote_proof" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "vote_proof_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"proof_type" "proof_type" NOT NULL,
	"vote_id" integer NOT NULL,
	"author_did" varchar(1000) NOT NULL,
	"proof" text NOT NULL,
	"proof_version" integer NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vote" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "vote_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"author_id" uuid NOT NULL,
	"comment_id" integer NOT NULL,
	"current_content_id" integer,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "vote_author_id_comment_id_unique" UNIQUE("author_id","comment_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "comment_content" ADD CONSTRAINT "comment_content_comment_id_comment_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comment"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "comment_content" ADD CONSTRAINT "comment_content_post_content_id_post_content_id_fk" FOREIGN KEY ("post_content_id") REFERENCES "public"."post_content"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "comment_content" ADD CONSTRAINT "comment_content_comment_proof_id_comment_proof_id_fk" FOREIGN KEY ("comment_proof_id") REFERENCES "public"."comment_proof"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "comment_content" ADD CONSTRAINT "comment_content_parent_id_comment_content_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."comment_content"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "comment_proof" ADD CONSTRAINT "comment_proof_comment_id_comment_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comment"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "comment_proof" ADD CONSTRAINT "comment_proof_parent_id_comment_proof_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."comment_proof"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "comment_proof" ADD CONSTRAINT "comment_proof_author_did_device_did_write_fk" FOREIGN KEY ("author_did") REFERENCES "public"."device"("did_write") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "comment" ADD CONSTRAINT "comment_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "comment" ADD CONSTRAINT "comment_post_id_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "comment" ADD CONSTRAINT "comment_current_content_id_comment_content_id_fk" FOREIGN KEY ("current_content_id") REFERENCES "public"."comment_content"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "device" ADD CONSTRAINT "device_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "device" ADD CONSTRAINT "device_id_proof_id_id_proof_id_fk" FOREIGN KEY ("id_proof_id") REFERENCES "public"."id_proof"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "email" ADD CONSTRAINT "email_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "id_proof" ADD CONSTRAINT "id_proof_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "moderation_table" ADD CONSTRAINT "moderation_table_report_id_report_table_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."report_table"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "moderation_table" ADD CONSTRAINT "moderation_table_moderator_id_user_id_fk" FOREIGN KEY ("moderator_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "passport" ADD CONSTRAINT "passport_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "phone" ADD CONSTRAINT "phone_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "poll_response_content" ADD CONSTRAINT "poll_response_content_poll_response_id_poll_response_id_fk" FOREIGN KEY ("poll_response_id") REFERENCES "public"."poll_response"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "poll_response_content" ADD CONSTRAINT "poll_response_content_poll_response_proof_id_poll_response_proof_id_fk" FOREIGN KEY ("poll_response_proof_id") REFERENCES "public"."poll_response_proof"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "poll_response_content" ADD CONSTRAINT "poll_response_content_post_content_id_post_content_id_fk" FOREIGN KEY ("post_content_id") REFERENCES "public"."post_content"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "poll_response_content" ADD CONSTRAINT "poll_response_content_parent_id_poll_response_content_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."poll_response_content"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "poll_response_proof" ADD CONSTRAINT "poll_response_proof_post_id_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "poll_response_proof" ADD CONSTRAINT "poll_response_proof_parent_id_poll_response_proof_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."poll_response_proof"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "poll_response_proof" ADD CONSTRAINT "poll_response_proof_author_did_device_did_write_fk" FOREIGN KEY ("author_did") REFERENCES "public"."device"("did_write") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "poll_response" ADD CONSTRAINT "poll_response_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "poll_response" ADD CONSTRAINT "poll_response_post_id_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "poll_response" ADD CONSTRAINT "poll_response_current_content_id_poll_response_content_id_fk" FOREIGN KEY ("current_content_id") REFERENCES "public"."poll_response_content"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "poll" ADD CONSTRAINT "poll_post_content_id_post_content_id_fk" FOREIGN KEY ("post_content_id") REFERENCES "public"."post_content"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "post_content" ADD CONSTRAINT "post_content_post_id_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "post_content" ADD CONSTRAINT "post_content_post_proof_id_post_proof_id_fk" FOREIGN KEY ("post_proof_id") REFERENCES "public"."post_proof"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "post_content" ADD CONSTRAINT "post_content_parent_id_post_content_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."post_content"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "post_content" ADD CONSTRAINT "post_content_poll_id_poll_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."poll"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "post_proof" ADD CONSTRAINT "post_proof_post_id_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "post_proof" ADD CONSTRAINT "post_proof_parent_id_post_proof_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."post_proof"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "post_proof" ADD CONSTRAINT "post_proof_author_did_device_did_write_fk" FOREIGN KEY ("author_did") REFERENCES "public"."device"("did_write") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "post" ADD CONSTRAINT "post_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "post" ADD CONSTRAINT "post_current_content_id_post_content_id_fk" FOREIGN KEY ("current_content_id") REFERENCES "public"."post_content"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "report_table" ADD CONSTRAINT "report_table_post_id_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "report_table" ADD CONSTRAINT "report_table_comment_id_post_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."post"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "report_table" ADD CONSTRAINT "report_table_reporter_id_user_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "report_table" ADD CONSTRAINT "report_table_moderation_id_moderation_table_id_fk" FOREIGN KEY ("moderation_id") REFERENCES "public"."moderation_table"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_language_preference" ADD CONSTRAINT "user_language_preference_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_language_preference" ADD CONSTRAINT "user_language_preference_lang_id_user_language_id_fk" FOREIGN KEY ("lang_id") REFERENCES "public"."user_language"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_post_topic_preference" ADD CONSTRAINT "user_post_topic_preference_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_post_topic_preference" ADD CONSTRAINT "user_post_topic_preference_post_tag_id_post_topic_id_fk" FOREIGN KEY ("post_tag_id") REFERENCES "public"."post_topic"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user" ADD CONSTRAINT "user_organisation_id_organisation_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisation"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vote_content" ADD CONSTRAINT "vote_content_vote_id_vote_id_fk" FOREIGN KEY ("vote_id") REFERENCES "public"."vote"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vote_content" ADD CONSTRAINT "vote_content_vote_proof_id_vote_proof_id_fk" FOREIGN KEY ("vote_proof_id") REFERENCES "public"."vote_proof"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vote_content" ADD CONSTRAINT "vote_content_comment_content_id_comment_content_id_fk" FOREIGN KEY ("comment_content_id") REFERENCES "public"."comment_content"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vote_proof" ADD CONSTRAINT "vote_proof_vote_id_vote_id_fk" FOREIGN KEY ("vote_id") REFERENCES "public"."vote"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vote_proof" ADD CONSTRAINT "vote_proof_author_did_device_did_write_fk" FOREIGN KEY ("author_did") REFERENCES "public"."device"("did_write") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vote" ADD CONSTRAINT "vote_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vote" ADD CONSTRAINT "vote_comment_id_comment_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comment"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vote" ADD CONSTRAINT "vote_current_content_id_vote_content_id_fk" FOREIGN KEY ("current_content_id") REFERENCES "public"."vote_content"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_idx_lang" ON "user_language_preference" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_idx_topic" ON "user_post_topic_preference" USING btree ("user_id");