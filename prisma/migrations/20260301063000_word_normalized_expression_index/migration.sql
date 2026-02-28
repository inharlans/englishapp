CREATE INDEX IF NOT EXISTS "Word_normalized_en_expr_idx"
ON "Word" (lower(trim(regexp_replace(replace(replace("en", '-', ' '), '_', ' '), '\s+', ' ', 'g'))));
