-- Categories become one shared list, used by prestations and by photos.
--
-- Until now the gallery kept its own free-text category on each image, so
-- "Ongles" existed twice with no relation between them. This unifies them:
-- the table is renamed, and the gallery strings are turned into rows, creating
-- the ones that only existed on photos.

ALTER TABLE "service_categories" RENAME TO "categories";

ALTER INDEX "service_categories_pkey" RENAME TO "categories_pkey";
ALTER INDEX "service_categories_providerId_name_key"
  RENAME TO "categories_providerId_name_key";
ALTER INDEX "service_categories_providerId_position_idx"
  RENAME TO "categories_providerId_position_idx";

ALTER TABLE "categories"
  RENAME CONSTRAINT "service_categories_providerId_fkey" TO "categories_providerId_fkey";

ALTER TABLE "gallery_images" ADD COLUMN "categoryId" TEXT;

-- Names used only on photos do not exist as rows yet, so they are created and
-- appended after the categories the provider already ordered.
WITH missing AS (
  SELECT DISTINCT g."providerId", btrim(g."category") AS name
  FROM "gallery_images" g
  WHERE g."category" IS NOT NULL
    AND btrim(g."category") <> ''
    AND NOT EXISTS (
      SELECT 1 FROM "categories" c
      WHERE c."providerId" = g."providerId"
        AND c."name" = btrim(g."category")
    )
),
next_position AS (
  SELECT "providerId", MAX("position") + 1 AS start
  FROM "categories"
  GROUP BY "providerId"
)
INSERT INTO "categories" (
  "id", "providerId", "name", "position", "active", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  m."providerId",
  m.name,
  COALESCE(n.start, 0)
    + (row_number() OVER (PARTITION BY m."providerId" ORDER BY m.name))::int - 1,
  true,
  now(),
  now()
FROM missing m
LEFT JOIN next_position n ON n."providerId" = m."providerId";

UPDATE "gallery_images" g
SET "categoryId" = c."id"
FROM "categories" c
WHERE c."providerId" = g."providerId"
  AND c."name" = btrim(g."category");

ALTER TABLE "gallery_images" DROP COLUMN "category";

CREATE INDEX "gallery_images_categoryId_idx" ON "gallery_images" ("categoryId");

-- Deleting a category never deletes a photo: it simply becomes unfiled.
ALTER TABLE "gallery_images"
  ADD CONSTRAINT "gallery_images_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "categories"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
