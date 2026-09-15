-- Earlier workers JSON-encoded these values before passing them to the ORM's
-- JSON serializer. Decode only strings containing the expected JSON shape.
UPDATE ranking_score
SET scores = CASE
        WHEN jsonb_typeof(scores) = 'string' AND (scores #>> '{}') IS JSON ARRAY
        THEN (scores #>> '{}')::jsonb
        ELSE scores
    END,
    participant_counts = CASE
        WHEN jsonb_typeof(participant_counts) = 'string' AND (participant_counts #>> '{}') IS JSON OBJECT
        THEN (participant_counts #>> '{}')::jsonb
        ELSE participant_counts
    END,
    pipeline_config = CASE
        WHEN jsonb_typeof(pipeline_config) = 'string' AND (pipeline_config #>> '{}') IS JSON OBJECT
        THEN (pipeline_config #>> '{}')::jsonb
        ELSE pipeline_config
    END
WHERE jsonb_typeof(scores) = 'string'
   OR jsonb_typeof(participant_counts) = 'string'
   OR jsonb_typeof(pipeline_config) = 'string';
