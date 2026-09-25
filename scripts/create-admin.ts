/**
 * Create a platform administrator.
 *
 * Usage:
 *   npm run admin:create -- --email vous@exemple.com --name "Votre nom" [--password "..."]
 *
 * This one has to be a command, because of the obvious chicken and egg: the
 * screen that creates accounts is itself behind an administrator login. Run it
 * once, then everything else happens in the browser.
 *
 * Running it again on an existing address promotes that account rather than
 * failing, which is the useful behaviour when you realise afterwards that you
 * signed up as a provider.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generatePassword } from "../src/lib/platform/providers";

const prisma = new PrismaClient();

function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      args[key] = next;
      i += 1;
    } else {
      args[key] = "true";
    }
  }
  return args;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const email = args.email?.trim().toLowerCase();
  const name = args.name?.trim();

  if (!email || !name) {
    console.error("Arguments manquants. Il faut --email et --name.");
    process.exitCode = 1;
    return;
  }

  const password = args.password ?? generatePassword();
  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        role: "PLATFORM_ADMIN",
        name,
        passwordHash,
        active: true,
        failedLoginCount: 0,
        lockedUntil: null,
        // An administrator account is not attached to any business: leaving a
        // provider on it would send them to that provider's dashboard.
        providerId: null,
      },
    });

    // The old password is gone, so the old sessions must go with it.
    await prisma.session.updateMany({
      where: { userId: existing.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    console.log(`\nCompte existant promu administrateur de plateforme.\n`);
  } else {
    await prisma.user.create({
      data: { email, name, role: "PLATFORM_ADMIN", passwordHash },
    });

    console.log(`\nAdministrateur de plateforme créé.\n`);
  }

  console.log(
    [
      `  Identifiant  : ${email}`,
      `  Mot de passe : ${password}`,
      "",
      "  Connectez-vous sur /login, vous arriverez sur /admin.",
      "",
    ].join("\n"),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
