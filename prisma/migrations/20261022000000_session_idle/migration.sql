-- An idle timeout for personal spaces.
--
-- Sessions already expired seven days after sign-in, checked on every read.
-- What they did not have is a notion of being left alone: a window opened on a
-- borrowed phone stayed valid for the whole week whether or not anybody came
-- back to it, which in a salon — shared tablets, a cybercafé on the corner —
-- is the likelier way a session leaks than any attack on the cookie.
--
-- This column records the last time a session was used. The application
-- refuses one that has been idle past its window, and refreshes the stamp as
-- the owner works.
--
-- Existing rows start at their creation time rather than at `now()`: a session
-- that has been dormant for six days should not be granted a fresh idle window
-- by the migration that introduces the idea.
--
-- Additive, defaulted and replayable.

ALTER TABLE "sessions"
  ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMPTZ(3) NOT NULL DEFAULT now();

UPDATE "sessions" SET "lastSeenAt" = "createdAt" WHERE "lastSeenAt" > "createdAt";

-- The sweep reads this column; without an index it scans the table.
CREATE INDEX IF NOT EXISTS "sessions_lastSeenAt_idx" ON "sessions" ("lastSeenAt");
