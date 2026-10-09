-- Customer reviews, left after an appointment.
--
-- One per appointment, enforced here rather than trusted to the route: a
-- double click or a replayed request must not post the same opinion twice.
-- The rating is bounded by the database too, so no path can store a 0 or a 7.
--
-- Additive: a new table, nothing existing is altered.

CREATE TABLE IF NOT EXISTS "reviews" (
  "id"            TEXT NOT NULL,
  "providerId"    TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "serviceId"     TEXT,
  "customerName"  TEXT NOT NULL,
  "rating"        INTEGER NOT NULL,
  "comment"       TEXT NOT NULL,
  "hidden"        BOOLEAN NOT NULL DEFAULT false,
  "createdAt"     TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reviews_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "reviews_rating_range" CHECK ("rating" BETWEEN 1 AND 5)
);

CREATE UNIQUE INDEX IF NOT EXISTS "reviews_appointmentId_key" ON "reviews"("appointmentId");
CREATE INDEX IF NOT EXISTS "reviews_providerId_hidden_createdAt_idx" ON "reviews"("providerId", "hidden", "createdAt");

ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_providerId_fkey" FOREIGN KEY ("providerId")
    REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_appointmentId_fkey" FOREIGN KEY ("appointmentId")
    REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_serviceId_fkey" FOREIGN KEY ("serviceId")
    REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;
