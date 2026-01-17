-- 포스트 slug 형식 마이그레이션
-- YYYY-MM-DD-slugPart -> YYYYMMDD-slugPart
--
-- Supabase SQL Editor에서 실행

-- 1. 먼저 변경될 내용 미리보기 (DRY RUN)
SELECT
  id,
  slug AS old_slug,
  CONCAT(
    SUBSTRING(slug, 1, 4),
    SUBSTRING(slug, 6, 2),
    SUBSTRING(slug, 9, 2),
    SUBSTRING(slug, 11)
  ) AS new_slug
FROM "Post"
WHERE slug IS NOT NULL
  AND slug ~ '^\d{4}-\d{2}-\d{2}-.+$';

-- 2. 실제 업데이트 실행 (위 결과 확인 후 실행)
UPDATE "Post"
SET slug = CONCAT(
  SUBSTRING(slug, 1, 4),
  SUBSTRING(slug, 6, 2),
  SUBSTRING(slug, 9, 2),
  SUBSTRING(slug, 11)
)
WHERE slug IS NOT NULL
  AND slug ~ '^\d{4}-\d{2}-\d{2}-.+$';
