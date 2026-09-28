/**
 * Create a provider and her first login, from a terminal.
 *
 * Usage:
 *   npm run provider:create -- \
 *     --business "Studio Lina" --owner "Lina Traore" --email lina@example.com \
 *     [--slug studio-lina] [--activity coiffure] [--city Cotonou] \
 *     [--phone "+229 ..."] [--timezone Africa/Abidjan] [--currency XOF] \
 *     [--password "..."] [--no-catalogue] [--no-email]
 *
 * Everything happens through `createProvider`, the same function the platform
 * screens call, so an account made here and one made in the browser are the
 * same account with the same defaults and the same welcome email.
 */

import { PrismaClient } from "@prisma/client";
import { createProvider, PlatformError } from "../src/lib/platform/providers";
import { isActivityId, listActivities } from "../src/lib/platform/activities";

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

  const businessName = args.business ?? args.businessName;
  const ownerName = args.owner ?? args.ownerName;
  const email = args.email;

  if (!businessName || !ownerName || !email) {
    console.error(
      "Arguments manquants. Il faut --business, --owner et --email.\n" +
        "Métiers disponibles pour --activity : " +
        listActivities().map((a) => a.id).join(", "),
    );
    process.exitCode = 1;
    return;
  }

  if (args.activity && !isActivityId(args.activity)) {
    console.error(
      `Métier inconnu : ${args.activity}\n` +
        "Choisissez parmi : " + listActivities().map((a) => a.id).join(", "),
    );
    process.exitCode = 1;
    return;
  }

  try {
    const created = await createProvider({
      businessName,
      ownerName,
      email,
      slug: args.slug,
      phone: args.phone,
      whatsappPhone: args.whatsapp,
      addressLine: args.address,
      city: args.city,
      country: args.country,
      timezone: args.timezone,
      currency: args.currency,
      password: args.password,
      activity: args.activity as never,
      // `--no-catalogue` and `--no-email` arrive as the strings "no-catalogue"
      // and "no-email" set to "true", since the parser has no notion of flags.
      seedCatalogue: args["no-catalogue"] !== "true",
      sendWelcomeEmail: args["no-email"] !== "true",
    });

    const lines = [
      "",
      "Activité créée.",
      "",
      `  Activité : ${created.provider.businessName}`,
      `  Adresse  : /${created.provider.slug}`,
      `  Fuseau   : ${created.provider.timezone}`,
      `  Devise   : ${created.provider.currency}`,
      `  Statut   : brouillon, à publier depuis Paramètres`,
      "",
      "  Connexion",
      `    Identifiant  : ${created.email}`,
      `    Mot de passe : ${created.password}`,
      "",
    ];

    if (created.delivery.sent) {
      lines.push(
        `  Ces identifiants viennent de lui être envoyés à ${created.email}.`,
        "  Le mot de passe ci-dessus n'est répété nulle part ailleurs.",
        "",
      );
    } else {
      lines.push(
        `  L'e-mail n'est pas parti : ${created.delivery.reason}`,
        "  Transmettez-lui ce mot de passe par un canal privé, et demandez-lui",
        "  de le changer depuis Paramètres après sa première connexion.",
        "",
      );
    }

    console.log(lines.join("\n"));
  } catch (error) {
    if (error instanceof PlatformError) {
      console.error(`\n${error.message}\n`);
      process.exitCode = 1;
      return;
    }
    throw error;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
