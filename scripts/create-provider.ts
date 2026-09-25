/**
 * Create a new provider and its first login.
 *
 * Usage:
 *   npx tsx scripts/create-provider.ts \
 *     --slug studio-lina \
 *     --business "Studio Lina" \
 *     --owner "Lina Traoré" \
 *     --email lina@example.com \
 *     [--password "..."] [--timezone Africa/Abidjan] [--currency XOF] [--phone "+225 ..."]
 *
 * A password is generated when none is given, and printed once. Sensible
 * defaults are written for hours, theme and booking rules so the provider can
 * log in and see a working site straight away.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

const prisma = new PrismaClient();

type Args = Record<string, string>;

function parseArgs(argv: string[]): Args {
  const args: Args = {};
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

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function generatePassword(): string {
  // Readable but strong: 4 groups of 4 from an unambiguous alphabet.
  const alphabet = "ACDEFGHJKMNPQRTUVWXY234679";
  const bytes = randomBytes(16);
  let out = "";
  for (let i = 0; i < 16; i += 1) {
    if (i > 0 && i % 4 === 0) out += "-";
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const businessName = args.business ?? args.businessName;
  const ownerName = args.owner ?? args.ownerName;
  const email = args.email?.trim().toLowerCase();

  if (!businessName || !ownerName || !email) {

    console.error(
      "Missing required argument. Need --business, --owner and --email.",
    );
    process.exitCode = 1;
    return;
  }

  const slug = slugify(args.slug ?? businessName);
  const password = args.password ?? generatePassword();

  const existingSlug = await prisma.provider.findUnique({ where: { slug } });
  if (existingSlug) {

    console.error(`A provider already uses the slug "${slug}".`);
    process.exitCode = 1;
    return;
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {

    console.error(`A user already exists with the email "${email}".`);
    process.exitCode = 1;
    return;
  }

  const provider = await prisma.provider.create({
    data: {
      slug,
      // Starts as a draft: the provider publishes it once the content is ready.
      status: "DRAFT",
      businessName,
      ownerName,
      email,
      phone: args.phone ?? null,
      whatsappPhone: args.whatsapp ?? args.phone ?? null,
      city: args.city ?? null,
      country: args.country ?? null,
      timezone: args.timezone ?? "Africa/Porto-Novo",
      currency: (args.currency ?? "XOF").toUpperCase(),
      theme: { create: {} },
      siteSettings: { create: {} },
      bookingSettings: { create: {} },
      workingHours: {
        create: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
          dayOfWeek,
          // Closed Sunday by default; every other day 09:00 to 18:00.
          active: dayOfWeek !== 0,
          openMinute: 9 * 60,
          closeMinute: 18 * 60,
        })),
      },
      users: {
        create: {
          email,
          name: ownerName,
          role: "PROVIDER",
          passwordHash: await bcrypt.hash(password, 12),
        },
      },
    },
  });


  console.log(
    [
      "",
      "Provider created.",
      "",
      `  Business : ${provider.businessName}`,
      `  Slug     : ${provider.slug}   (public site: /${provider.slug})`,
      `  Timezone : ${provider.timezone}`,
      `  Currency : ${provider.currency}`,
      `  Status   : DRAFT — publish it from Paramètres once the content is ready`,
      "",
      "  Login",
      `    Email    : ${email}`,
      `    Password : ${password}`,
      "",
      "  Share this password over a private channel and ask them to change it",
      "  from Paramètres after the first sign-in.",
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
