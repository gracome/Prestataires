-- Prestation categories become rows instead of a free-text column.
--
-- Written by hand rather than generated: a generated diff would drop the old
-- column and lose every category already typed. This copies the data across
-- first, then removes the column.

CREATE TABLE "service_categories" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "service_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "service_categories_providerId_name_key"
  ON "service_categories" ("providerId", "name");

CREATE INDEX "service_categories_providerId_position_idx"
  ON "service_categories" ("providerId", "position");

ALTER TABLE "services" ADD COLUMN "categoryId" TEXT;

-- One category per distinct name already in use, per provider. The initial
-- order follows the position of the first prestation that used the name, so
-- the public catalogue keeps the order the provider had built.
INSERT INTO "service_categories" (
  "id", "providerId", "name", "position", "active", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  s."providerId",
  btrim(s."category"),
  (row_number() OVER (
     PARTITION BY s."providerId" ORDER BY min(s."position"), btrim(s."category")
   ))::int - 1,
  true,
  now(),
  now()
FROM "services" s
WHERE s."category" IS NOT NULL AND btrim(s."category") <> ''
GROUP BY s."providerId", btrim(s."category");

UPDATE "services" s
SET "categoryId" = c."id"
FROM "service_categories" c
WHERE c."providerId" = s."providerId"
  AND c."name" = btrim(s."category");

ALTER TABLE "services" DROP COLUMN "category";

CREATE INDEX "services_categoryId_idx" ON "services" ("categoryId");

ALTER TABLE "service_categories"
  ADD CONSTRAINT "service_categories_providerId_fkey"
  FOREIGN KEY ("providerId") REFERENCES "providers"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Deleting a category leaves its prestations in place, simply ungrouped.
ALTER TABLE "services"
  ADD CONSTRAINT "services_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "service_categories"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
