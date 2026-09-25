/**
 * Run the scheduled maintenance once, from a shell.
 *
 * Useful for a machine with cron but no way to call the HTTP endpoint:
 *
 *   *\/5 * * * * cd /srv/prestataire && npx tsx scripts/run-expiration.ts
 *
 * Does exactly what POST /api/jobs/run does.
 */

import { runScheduledJobs } from "../src/lib/jobs/runner";
import { prisma } from "../src/lib/db";

async function main(): Promise<void> {
  const report = await runScheduledJobs();


  console.log(JSON.stringify(report, null, 2));

  if (report.errors.length > 0) process.exitCode = 1;
}

main()
  .catch((error) => {

    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
