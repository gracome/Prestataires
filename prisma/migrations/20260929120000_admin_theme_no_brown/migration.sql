-- The dashboard stops being brown.
--
-- The "neutre" preset was neutral in name only: warm greys with a mauve-brown
-- accent (#8A5D5E) that nothing else on the platform wore. On screen it read
-- as weak coffee, and the selected period chip — the one control on the page
-- that has to look clickable — was the brownest thing on it.
--
-- Two changes. The column defaults move to true greys with the brand rose as
-- accent, and the rows still carrying the old defaults are moved with them.
--
-- The WHERE clause is the careful part: it updates a row only if every one of
-- the six colours still matches the old preset exactly. A provider who changed
-- so much as her accent keeps everything she chose — we are correcting a
-- default we shipped, not overruling anybody's taste.
--
-- Replayable: after it runs once, no row matches the old palette any more.

ALTER TABLE "themes"
  ALTER COLUMN "adminBackground" SET DEFAULT '#F6F6F7',
  ALTER COLUMN "adminText"       SET DEFAULT '#1F1E22',
  ALTER COLUMN "adminMuted"      SET DEFAULT '#6B6A72',
  ALTER COLUMN "adminBorder"     SET DEFAULT '#E5E4E9',
  ALTER COLUMN "adminAccent"     SET DEFAULT '#D6336C';

UPDATE "themes"
SET
  "adminBackground" = '#F6F6F7',
  "adminText"       = '#1F1E22',
  "adminMuted"      = '#6B6A72',
  "adminBorder"     = '#E5E4E9',
  "adminAccent"     = '#D6336C'
WHERE
  "adminBackground" = '#F6F5F4'
  AND "adminSurface" = '#FFFFFF'
  AND "adminText"    = '#23201F'
  AND "adminMuted"   = '#6F6763'
  AND "adminBorder"  = '#E6E1DE'
  AND "adminAccent"  = '#8A5D5E';

-- The "sable" preset keeps its warm neutrals, which are the point of it, and
-- loses only the brown accent: on beige it read as another shade of the
-- background rather than as something to click.
UPDATE "themes"
SET "adminAccent" = '#C0456E'
WHERE "adminPreset" = 'sand' AND "adminAccent" = '#A8714F';
