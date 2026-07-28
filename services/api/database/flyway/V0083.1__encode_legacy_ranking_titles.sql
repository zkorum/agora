UPDATE "ranking_item_content"
SET "title" = replace(
    replace(
        replace("title", '&', '&amp;'),
        '<',
        '&lt;'
    ),
    '>',
    '&gt;'
)
WHERE EXISTS (
    SELECT 1
    FROM "ranking_item_external_source"
    WHERE "ranking_item_external_source"."ranking_item_id" = "ranking_item_content"."ranking_item_id"
);

UPDATE "ranking_item_content_translation"
SET "translated_title" = replace(
    replace(
        replace("translated_title", '&', '&amp;'),
        '<',
        '&lt;'
    ),
    '>',
    '&gt;'
)
WHERE EXISTS (
    SELECT 1
    FROM "ranking_item_content"
    INNER JOIN "ranking_item_external_source"
        ON "ranking_item_external_source"."ranking_item_id" = "ranking_item_content"."ranking_item_id"
    WHERE "ranking_item_content"."id" = "ranking_item_content_translation"."ranking_item_content_id"
);
