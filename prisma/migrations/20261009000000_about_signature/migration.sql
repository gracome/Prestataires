-- A line under the provider's signed name in her about section, like the
-- motto on a business card.
--
-- Additive and replayable: one nullable column, so every existing site shows
-- exactly what it showed before until its owner writes one.

ALTER TABLE "site_settings"
  ADD COLUMN IF NOT EXISTS "aboutSignature" TEXT;
