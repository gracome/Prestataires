import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * A logical copy of every row in the database.
 *
 * Not a pg_dump: this runs where the application runs, which is the whole
 * point. The nightly pg_dump lives in a GitHub workflow that has never once
 * been allowed to start, and a backup that depends on somebody else's billing
 * is not a backup. This one needs nothing but a database connection, so it
 * runs from a serverless function, from a laptop, from anywhere.
 *
 * What it leaves out is what it does not need to carry:
 *
 *  - the schema, which is in prisma/migrations, in git, in three places;
 *  - the uploaded photos, which live in object storage and are copied by
 *    their own means;
 *  - sequences and extensions, which the migrations recreate.
 *
 * Paired with the migrations, the rows are enough to rebuild the database on
 * an empty Postgres. That is the test this has to pass, and scripts/restore
 * exists so it can actually be run rather than assumed.
 */

/** Bumped when the on-disk shape changes in a way a reader must know about. */
export const ARCHIVE_VERSION = 1;

export type Archive = {
  version: number;
  takenAt: string;
  /** The last migration applied, so a restore can refuse a mismatched schema. */
  migration: string | null;
  /** Model name -> every row, in the order Prisma returns them. */
  tables: Record<string, unknown[]>;
  counts: Record<string, number>;
};

/**
 * Every model in the schema, discovered rather than listed.
 *
 * A hand-written list of 32 names is a list that will be 32 names again after
 * the thirty-third model is added, and nothing would say so: the backup would
 * simply stop carrying the new table. Reading the datamodel means a model is
 * backed up because it exists, not because somebody remembered it.
 */
export function modelNames(): string[] {
  return Prisma.dmmf.datamodel.models.map((model) => model.name);
}

/** `Provider` -> `provider`, which is how the client exposes it. */
function clientKey(model: string): string {
  return model.charAt(0).toLowerCase() + model.slice(1);
}

/**
 * Models ordered so that a row is always written after the rows it points at.
 *
 * Restoring in alphabetical order fails the moment an Appointment arrives
 * before its Provider. The order is derived from the relations themselves —
 * a model that holds a foreign key waits for the model it refers to — so it
 * stays correct as the schema changes.
 *
 * A cycle (two models referring to each other) cannot be ordered; those are
 * returned last, and the restore inserts them with constraints deferred.
 */
export function restoreOrder(): { ordered: string[]; cyclic: string[] } {
  const models = Prisma.dmmf.datamodel.models;
  const names = new Set(models.map((model) => model.name));

  // Who each model must wait for: the targets of the relations whose foreign
  // key this model holds. `relationFromFields` is non-empty exactly on that
  // side of the relation.
  const waitsFor = new Map<string, Set<string>>();
  for (const model of models) {
    const deps = new Set<string>();
    for (const field of model.fields) {
      if (
        field.kind === "object" &&
        (field.relationFromFields?.length ?? 0) > 0 &&
        names.has(field.type) &&
        field.type !== model.name
      ) {
        deps.add(field.type);
      }
    }
    waitsFor.set(model.name, deps);
  }

  const ordered: string[] = [];
  const done = new Set<string>();

  let progressed = true;
  while (progressed) {
    progressed = false;
    for (const model of models) {
      if (done.has(model.name)) continue;
      const deps = waitsFor.get(model.name) ?? new Set();
      if ([...deps].every((dep) => done.has(dep))) {
        ordered.push(model.name);
        done.add(model.name);
        progressed = true;
      }
    }
  }

  const cyclic = models.map((m) => m.name).filter((name) => !done.has(name));
  return { ordered, cyclic };
}

/**
 * Read everything.
 *
 * Inside one transaction so the copy is consistent: without it, a booking
 * written between reading Appointment and reading Provider would arrive in
 * the archive pointing at a provider that is not in it.
 */
export async function exportDatabase(): Promise<Archive> {
  const names = modelNames();

  const { tables, migration } = await prisma.$transaction(
    async (tx) => {
      const collected: Record<string, unknown[]> = {};

      for (const name of names) {
        const delegate = (tx as unknown as Record<string, { findMany: () => Promise<unknown[]> }>)[
          clientKey(name)
        ];
        collected[name] = await delegate.findMany();
      }

      const applied = await tx.$queryRaw<{ migration_name: string }[]>`
        select migration_name
        from _prisma_migrations
        where finished_at is not null
        order by finished_at desc
        limit 1
      `.catch(() => []);

      return { tables: collected, migration: applied[0]?.migration_name ?? null };
    },
    { timeout: 120_000, isolationLevel: "RepeatableRead" },
  );

  const counts: Record<string, number> = {};
  for (const [name, rows] of Object.entries(tables)) counts[name] = rows.length;

  return {
    version: ARCHIVE_VERSION,
    takenAt: new Date().toISOString(),
    migration,
    tables,
    counts,
  };
}
