-- Support access leaves a trace.
--
-- A platform administrator can open a session on a provider's account to help
-- her. That session records who opened it, so the access can be shown back to
-- the provider and audited afterwards. A plain provider login leaves this null.
--
-- Written by hand and additive: no existing column is touched, so no session
-- in flight is disturbed.

ALTER TABLE "sessions" ADD COLUMN "impersonatorId" TEXT;

CREATE INDEX "sessions_impersonatorId_idx" ON "sessions"("impersonatorId");

-- SET NULL rather than CASCADE: deleting an administrator account must not
-- silently erase the record that they were in someone's data.
ALTER TABLE "sessions"
  ADD CONSTRAINT "sessions_impersonatorId_fkey"
  FOREIGN KEY ("impersonatorId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
