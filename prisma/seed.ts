import { prisma } from "../src/lib/db";
import { seedDemoProvider } from "../src/lib/demo/seed";

/**
 * `npm run db:seed`.
 *
 * The data itself lives in src/lib/demo/seed.ts, because the server needs it
 * too: the public demonstration is reset on a schedule by re-running exactly
 * what this command runs, and two copies of a thousand lines of fixtures would
 * drift apart within a week.
 */
seedDemoProvider()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
