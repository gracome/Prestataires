/**
 * Read a backup, and put it back.
 *
 * A copy nobody has ever restored is a guess, not a backup. This script is
 * the other half of src/lib/backup: it opens the file, says what is inside,
 * and can write it into an empty database.
 *
 *   npm run backup:restore -- --inspecter copie.bpbk
 *   npm run backup:restore -- --restaurer copie.bpbk --confirmer
 *
 * The passphrase comes from BACKUP_PASSPHRASE, or from --phrase.
 *
 * Restoring deletes every row in the target database first, which is why it
 * refuses to run without --confirmer and prints the host it is about to write
 * to. The one accident this guards against is restoring last night's copy
 * over a production database that was fine.
 */

import { readFileSync } from "node:fs";
import { Prisma, PrismaClient } from "@prisma/client";
import { open } from "../src/lib/backup/archive";
import { restoreOrder } from "../src/lib/backup/export";

type Mode = "inspecter" | "restaurer";

function arg(name: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  return at === -1 ? undefined : process.argv[at + 1];
}

function has(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function main(): Promise<void> {
  const mode: Mode | undefined = has("restaurer")
    ? "restaurer"
    : has("inspecter")
      ? "inspecter"
      : undefined;

  const path = arg(mode ?? "");

  if (!mode || !path) {
    console.error(
      "Usage :\n" +
        "  npm run backup:restore -- --inspecter copie.bpbk\n" +
        "  npm run backup:restore -- --restaurer copie.bpbk --confirmer",
    );
    process.exitCode = 1;
    return;
  }

  const passphrase = arg("phrase") ?? process.env.BACKUP_PASSPHRASE;
  if (!passphrase) {
    console.error(
      "Phrase secrète absente : passez --phrase, ou renseignez BACKUP_PASSPHRASE.",
    );
    process.exitCode = 1;
    return;
  }

  const archive = open(readFileSync(path), passphrase);
  const rows = Object.values(archive.counts).reduce((total, n) => total + n, 0);

  console.log(`copie du      : ${archive.takenAt}`);
  console.log(`migration     : ${archive.migration ?? "inconnue"}`);
  console.log(`contenu       : ${rows} lignes\n`);

  for (const [name, count] of Object.entries(archive.counts).sort(
    (a, b) => b[1] - a[1],
  )) {
    if (count > 0) console.log(`  ${name.padEnd(24)} ${count}`);
  }

  const problems = checkAgainstSchema(archive);

  if (problems.length > 0) {
    console.error("\nCette copie ne correspond pas au schéma actuel :");
    for (const problem of problems) console.error(`  ${problem}`);
    console.error(
      "\nUne restauration échouerait. Appliquez d'abord les migrations qui" +
        "\ncorrespondent à la copie, ou restaurez-la dans cette version-là.",
    );
    process.exitCode = 1;
    return;
  }

  console.log("\nLes colonnes de la copie correspondent au schéma actuel.");

  if (mode === "inspecter") {
    console.log("Rien n'a été écrit.");
    return;
  }

  const target = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!target) {
    console.error("\nNi DIRECT_URL ni DATABASE_URL n'est défini.");
    process.exitCode = 1;
    return;
  }

  const host = new URL(target).host;

  if (!has("confirmer")) {
    console.error(
      `\nLa restauration EFFACE toutes les lignes de ${host} avant d'écrire.` +
        "\nRelancez avec --confirmer si c'est bien ce que vous voulez.",
    );
    process.exitCode = 1;
    return;
  }

  console.log(`\nRestauration vers ${host}…`);

  const prisma = new PrismaClient({ datasources: { db: { url: target } } });
  const { ordered, cyclic } = restoreOrder();
  const plan = [...ordered, ...cyclic];

  if (cyclic.length > 0) {
    console.warn(
      `Modèles en dépendance circulaire, écrits en dernier : ${cyclic.join(", ")}`,
    );
  }

  try {
    // Children before parents, which is the insertion order reversed.
    for (const name of [...plan].reverse()) {
      await delegate(prisma, name).deleteMany({});
    }

    let written = 0;
    for (const name of plan) {
      const data = archive.tables[name] ?? [];
      if (data.length === 0) continue;

      // In batches: one createMany of fifty thousand rows is one statement
      // the database has to hold entirely in memory.
      for (let at = 0; at < data.length; at += 500) {
        await delegate(prisma, name).createMany({
          data: data.slice(at, at + 500),
        });
      }

      written += data.length;
      console.log(`  ${name.padEnd(24)} ${data.length}`);
    }

    console.log(`\n${written} lignes restaurées.`);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Does this copy still fit the schema?
 *
 * The failure this catches is the slow one: a column added or renamed months
 * after the copy was taken, so the restore throws on the first row and the
 * person running it is already in the middle of an incident. Checking the
 * column names against the datamodel needs no database, so it can be run on
 * a quiet afternoon — which is the only useful time to find out.
 *
 * A column missing from the copy is fine when it is nullable or has a default;
 * a column in the copy that the schema no longer has is not.
 */
function checkAgainstSchema(archive: {
  tables: Record<string, unknown[]>;
}): string[] {
  const problems: string[] = [];

  for (const model of Prisma.dmmf.datamodel.models) {
    const rows = archive.tables[model.name];
    if (!rows || rows.length === 0) continue;

    const scalars = new Set(
      model.fields.filter((f) => f.kind !== "object").map((f) => f.name),
    );
    const required = model.fields.filter(
      (f) =>
        f.kind !== "object" &&
        f.isRequired &&
        !f.hasDefaultValue &&
        !f.isUpdatedAt,
    );

    const seen = new Set<string>();
    for (const row of rows) {
      for (const key of Object.keys(row as object)) seen.add(key);
    }

    for (const key of seen) {
      if (!scalars.has(key)) {
        problems.push(`${model.name}.${key} n'existe plus dans le schéma`);
      }
    }
    for (const field of required) {
      if (!seen.has(field.name)) {
        problems.push(
          `${model.name}.${field.name} est obligatoire et absent de la copie`,
        );
      }
    }
  }

  const unknown = Object.keys(archive.tables).filter(
    (name) => !Prisma.dmmf.datamodel.models.some((m) => m.name === name),
  );
  for (const name of unknown) {
    if ((archive.tables[name] ?? []).length > 0) {
      problems.push(`la table ${name} n'existe plus dans le schéma`);
    }
  }

  return problems;
}

type Delegate = {
  deleteMany: (args: object) => Promise<unknown>;
  createMany: (args: { data: unknown[] }) => Promise<unknown>;
};

function delegate(client: PrismaClient, model: string): Delegate {
  const key = model.charAt(0).toLowerCase() + model.slice(1);
  return (client as unknown as Record<string, Delegate>)[key];
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
