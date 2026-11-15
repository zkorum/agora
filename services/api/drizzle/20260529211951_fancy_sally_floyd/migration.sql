ALTER TABLE "survey_aggregate_result" RENAME COLUMN "count" TO "suppressed_count";--> statement-breakpoint
ALTER TABLE "survey_aggregate_result" RENAME COLUMN "percentage" TO "suppressed_percentage";--> statement-breakpoint
ALTER TABLE "survey_aggregate_result" DROP CONSTRAINT "survey_aggregate_result_suppression_check";--> statement-breakpoint
ALTER TABLE "survey_aggregate_question" ADD COLUMN "is_public_aggregate_suppression_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "survey_aggregate_result" ADD COLUMN "full_count" integer;--> statement-breakpoint
ALTER TABLE "survey_aggregate_result" ADD COLUMN "full_percentage" real;--> statement-breakpoint
ALTER TABLE "survey_question" ADD COLUMN "is_public_aggregate_suppression_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
WITH owner_rows AS (
    SELECT
        owner_current.survey_aggregate_snapshot_id,
        owner_row.value AS row_data
    FROM survey_aggregate_owner_current owner_current
    CROSS JOIN LATERAL jsonb_array_elements(owner_current.rows) AS owner_row(value)
),
parsed_owner_rows AS (
    SELECT
        survey_aggregate_snapshot_id,
        row_data ->> 'scope' AS row_scope,
        (row_data ->> 'candidateId')::integer AS candidate_id,
        (row_data ->> 'groupId')::integer AS group_id,
        row_data ->> 'questionId' AS question_slug_id,
        row_data ->> 'optionId' AS option_slug_id,
        (row_data ->> 'count')::integer AS full_count,
        (row_data ->> 'percentage')::real AS full_percentage
    FROM owner_rows
    WHERE row_data ->> 'count' IS NOT NULL
),
matching_owner_rows AS (
    SELECT DISTINCT ON (result.id)
        result.id,
        parsed_owner_rows.full_count,
        parsed_owner_rows.full_percentage
    FROM survey_aggregate_result result
    INNER JOIN survey_aggregate_question question
        ON question.id = result.survey_aggregate_question_id
    INNER JOIN survey_aggregate_option option
        ON option.id = result.survey_aggregate_option_id
    INNER JOIN parsed_owner_rows
        ON parsed_owner_rows.survey_aggregate_snapshot_id = result.survey_aggregate_snapshot_id
        AND parsed_owner_rows.question_slug_id = question.question_slug_id
        AND parsed_owner_rows.option_slug_id = option.option_slug_id
        AND (
            (
                result.scope = 'overall'
                AND parsed_owner_rows.row_scope = 'overall'
                AND parsed_owner_rows.candidate_id IS NULL
                AND parsed_owner_rows.group_id IS NULL
            )
            OR (
                result.scope = 'opinion_group'
                AND parsed_owner_rows.row_scope = 'cluster'
                AND parsed_owner_rows.candidate_id = result.candidate_id
                AND parsed_owner_rows.group_id = result.group_id
            )
        )
    ORDER BY result.id
)
UPDATE survey_aggregate_result result
SET
    full_count = matching_owner_rows.full_count,
    full_percentage = matching_owner_rows.full_percentage
FROM matching_owner_rows
WHERE result.id = matching_owner_rows.id;--> statement-breakpoint
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM survey_aggregate_result
        WHERE full_count IS NULL
    ) THEN
        RAISE EXCEPTION 'survey_aggregate_result full_count backfill incomplete';
    END IF;
END $$;--> statement-breakpoint
WITH suppressed_blocks AS (
    SELECT
        result.survey_aggregate_snapshot_id,
        result.scope,
        result.candidate_id,
        result.group_id,
        result.survey_aggregate_question_id,
        bool_or(
            result.full_count > 0
            AND result.full_count < snapshot.suppression_threshold
        ) AS should_suppress
    FROM survey_aggregate_result result
    INNER JOIN survey_aggregate_snapshot snapshot
        ON snapshot.id = result.survey_aggregate_snapshot_id
    GROUP BY
        result.survey_aggregate_snapshot_id,
        result.scope,
        result.candidate_id,
        result.group_id,
        result.survey_aggregate_question_id
)
UPDATE survey_aggregate_result result
SET
    suppressed_count = CASE
        WHEN suppressed_blocks.should_suppress THEN NULL
        ELSE result.full_count
    END,
    suppressed_percentage = CASE
        WHEN suppressed_blocks.should_suppress THEN NULL
        ELSE result.full_percentage
    END,
    is_suppressed = suppressed_blocks.should_suppress,
    suppression_reason = CASE
        WHEN suppressed_blocks.should_suppress AND result.scope = 'opinion_group'
            THEN 'cluster_deductive_disclosure'::survey_aggregate_suppression_reason_enum
        WHEN suppressed_blocks.should_suppress
            THEN 'count_below_threshold'::survey_aggregate_suppression_reason_enum
        ELSE NULL
    END
FROM suppressed_blocks
WHERE result.survey_aggregate_snapshot_id = suppressed_blocks.survey_aggregate_snapshot_id
    AND result.scope = suppressed_blocks.scope
    AND result.candidate_id IS NOT DISTINCT FROM suppressed_blocks.candidate_id
    AND result.group_id IS NOT DISTINCT FROM suppressed_blocks.group_id
    AND result.survey_aggregate_question_id = suppressed_blocks.survey_aggregate_question_id;--> statement-breakpoint
ALTER TABLE "survey_aggregate_result" ADD CONSTRAINT "survey_aggregate_result_suppression_check" CHECK ((("survey_aggregate_result"."is_suppressed" = true AND "survey_aggregate_result"."suppressed_count" is null AND "survey_aggregate_result"."suppressed_percentage" is null AND "survey_aggregate_result"."suppression_reason" is not null) OR ("survey_aggregate_result"."is_suppressed" = false AND "survey_aggregate_result"."suppressed_count" is not null AND "survey_aggregate_result"."suppression_reason" is null)));
