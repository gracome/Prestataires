-- Web push.
--
-- A provider works with her hands busy. An email she reads tonight is no use
-- when a booking lands now, so a browser that agreed to it gets a notification
-- straight away.
--
-- One row per browser, not per person: the same account on a phone and on a
-- laptop is two subscriptions and both should ring.
--
-- Additive, and written to be safe to replay: adding a value to an enum is
-- the one statement PostgreSQL will not roll back with the rest, so a half
-- applied run must not block the next one.

ALTER TYPE "NotificationChannel" ADD VALUE IF NOT EXISTS 'PUSH';

CREATE TABLE IF NOT EXISTS "push_subscriptions" (
  "id"           TEXT NOT NULL,
  "providerId"   TEXT NOT NULL,
  "userId"       TEXT NOT NULL,
  -- The push service's own address for this browser. Unique by definition,
  -- which is what makes re-subscribing from the same device idempotent.
  "endpoint"     TEXT NOT NULL,
  "p256dh"       TEXT NOT NULL,
  "auth"         TEXT NOT NULL,
  "userAgent"    TEXT,
  "failureCount" INTEGER NOT NULL DEFAULT 0,
  "lastSentAt"   TIMESTAMPTZ(3),
  "createdAt"    TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "push_subscriptions_endpoint_key"
  ON "push_subscriptions"("endpoint");
CREATE INDEX IF NOT EXISTS "push_subscriptions_providerId_idx"
  ON "push_subscriptions"("providerId");
CREATE INDEX IF NOT EXISTS "push_subscriptions_userId_idx"
  ON "push_subscriptions"("userId");

-- Losing the account or the business means losing the right to be notified,
-- so both cascade. ADD CONSTRAINT has no IF NOT EXISTS, hence the guard.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'push_subscriptions_providerId_fkey'
  ) THEN
    ALTER TABLE "push_subscriptions"
      ADD CONSTRAINT "push_subscriptions_providerId_fkey"
      FOREIGN KEY ("providerId") REFERENCES "providers"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'push_subscriptions_userId_fkey'
  ) THEN
    ALTER TABLE "push_subscriptions"
      ADD CONSTRAINT "push_subscriptions_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
