import { PrismaClient } from "@prisma/client";

/**
 * A single PrismaClient per process. Next.js hot-reloads modules in dev, so the
 * instance is parked on globalThis to avoid exhausting the connection pool.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Postgres error raised when the appointment exclusion constraint rejects an
 * overlapping booking. Used to turn a race into a clean "slot taken" answer.
 */
export const PG_EXCLUSION_VIOLATION = "23P01";
export const PG_UNIQUE_VIOLATION = "23505";

export function isPgError(error: unknown, code: string): boolean {
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as { code?: unknown; meta?: { code?: unknown } };
  if (candidate.code === code) return true;
  // Prisma wraps raw-query failures and exposes the driver code under meta.
  return candidate.meta?.code === code;
}

export function isSlotConflictError(error: unknown): boolean {
  return (
    isPgError(error, PG_EXCLUSION_VIOLATION) ||
    // P2010 is Prisma's raw-query failure wrapper.
    (isPgError(error, "P2010") &&
      JSON.stringify(error).includes(PG_EXCLUSION_VIOLATION))
  );
}
