-- The order a provider gives her own home page.
--
-- Every site was the same page with different words in it. This lets her put
-- her work before her prices, or her opening hours at the top because that is
-- what people ask her all day.
--
-- An empty array means the order the platform ships, so every existing site
-- keeps exactly the page it had until its owner decides otherwise.
--
-- Additive and replayable: one column, with a default, on a table nobody else
-- is touching.

ALTER TABLE "site_settings"
  ADD COLUMN IF NOT EXISTS "sectionOrder" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
