-- Fix any existing empty titles before adding the constraint
UPDATE conversation_content
SET title = '[No title] Imported conversation'
WHERE title = '';

-- Add CHECK constraint to prevent empty titles
ALTER TABLE conversation_content
ADD CONSTRAINT conversation_content_title_not_empty
CHECK (length(trim(title)) > 0);
