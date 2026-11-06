/**
 * Take a backup from here, now.
 *
 *   npm run backup:now              envoie la copie par e-mail
 *   npm run backup:now -- --fichier copie.bpbk    l'écrit sur le disque
 *
 * The scheduled endpoint does the same thing every night. This is for the
 * moment before a migration, or for checking that the whole chain works
 * without waiting until tomorrow.
 */

import { writeFileSync } from "node:fs";
import { runBackup } from "../src/lib/backup/run";
import { exportDatabase } from "../src/lib/backup/export";
import { seal } from "../src/lib/backup/archive";
import { env } from "../src/lib/env";
import { prisma } from "../src/lib/db";

async function main(): Promise<void> {
  const at = process.argv.indexOf("--fichier");
  const path = at === -1 ? undefined : process.argv[at + 1];

  if (!path) {
    const report = await runBackup();
    console.log(
      `${report.rows} lignes, ${report.tables} tables, ` +
        `${(report.bytes / 1024).toFixed(0)} Ko envoyés à ${report.sentTo} ` +
        `en ${(report.durationMs / 1000).toFixed(1)} s.`,
    );
    return;
  }

  const passphrase = env().BACKUP_PASSPHRASE;
  if (!passphrase) {
    console.error("BACKUP_PASSPHRASE n'est pas configurée.");
    process.exitCode = 1;
    return;
  }

  const archive = await exportDatabase();
  const file = seal(archive, passphrase);
  writeFileSync(path, file);

  const rows = Object.values(archive.counts).reduce((total, n) => total + n, 0);
  console.log(`${rows} lignes, ${(file.length / 1024).toFixed(0)} Ko → ${path}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
