import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { sendMail } from "@/lib/email/mailer";
import { PRODUCT } from "@/lib/marketing/product";
import { exportDatabase } from "./export";
import { seal } from "./archive";

/**
 * Take one copy of the database and send it somewhere else.
 *
 * "Somewhere else" is the only requirement that matters. The object storage
 * this platform uses sits inside the same Supabase project as the database,
 * so a copy left there disappears in exactly the accident it exists for. An
 * attachment in a mailbox is off that project, off this host, and free.
 *
 * It will not scale for ever — a mailbox is not an archive and attachments
 * have limits — and the day it stops fitting is the day to put the file in
 * object storage at a second provider. The guard below says so out loud
 * rather than letting that day pass unnoticed.
 */

/** Brevo and most providers refuse past roughly 10 MB once base64 is counted. */
const ATTACHMENT_LIMIT = 7 * 1024 * 1024;

/**
 * Below this, something is wrong.
 *
 * An empty copy uploads as well as a good one and is only noticed on the day
 * it is needed. The platform cannot have fewer rows than this and still be
 * the platform, so a smaller archive is treated as a failure rather than
 * stored and forgotten.
 */
const MINIMUM_ROWS = 20;

export type BackupReport = {
  takenAt: string;
  rows: number;
  tables: number;
  bytes: number;
  sentTo: string;
  durationMs: number;
};

export async function runBackup(): Promise<BackupReport> {
  const started = Date.now();
  const config = env();

  const passphrase = config.BACKUP_PASSPHRASE;
  const recipient = config.BACKUP_EMAIL;

  if (!passphrase) {
    throw new Error(
      "BACKUP_PASSPHRASE n'est pas configurée : aucune sauvegarde n'est prise.",
    );
  }
  if (!recipient) {
    throw new Error("BACKUP_EMAIL n'est pas configurée : la copie n'irait nulle part.");
  }

  const run = await prisma.jobRun.create({
    data: { name: "database-backup" },
    select: { id: true },
  });

  try {
    const archive = await exportDatabase();
    const rows = Object.values(archive.counts).reduce((total, n) => total + n, 0);

    if (rows < MINIMUM_ROWS) {
      throw new Error(
        `La copie ne contient que ${rows} lignes, ce qui est anormal. ` +
          "Elle n'est pas conservée.",
      );
    }

    const file = seal(archive, passphrase);

    if (file.length > ATTACHMENT_LIMIT) {
      throw new Error(
        `La copie pèse ${mb(file.length)} Mo et ne passera pas en pièce jointe. ` +
          "Il est temps de l'envoyer vers un stockage objet chez un autre " +
          "hébergeur plutôt que par e-mail.",
      );
    }

    const stamp = archive.takenAt.slice(0, 19).replace(/[:T]/g, "-");
    const filename = `beautyprest-${stamp}.bpbk`;

    const lines = Object.entries(archive.counts)
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([name, n]) => `${name} : ${n}`);

    const text = [
      `Copie de la base du ${archive.takenAt}.`,
      "",
      `${rows} lignes dans ${lines.length} tables, ${mb(file.length)} Mo chiffrés.`,
      `Dernière migration : ${archive.migration ?? "inconnue"}`,
      "",
      "Le fichier joint est chiffré en AES-256. Sans la phrase secrète il est",
      "illisible, y compris par celui qui héberge cette boîte aux lettres.",
      "",
      "Pour le relire ou le restaurer :",
      "  npm run backup:restore -- --inspecter chemin/du/fichier.bpbk",
      "",
      ...lines,
    ].join("\n");

    const result = await sendMail({
      to: recipient,
      subject: `Sauvegarde ${PRODUCT.name} — ${archive.takenAt.slice(0, 10)}`,
      text,
      html: `<pre style="font:13px/1.6 ui-monospace,monospace">${escape(text)}</pre>`,
      attachments: [
        { filename, content: file, contentType: "application/octet-stream" },
      ],
    });

    if (!result.ok) {
      throw new Error(result.error ?? "Envoi refusé par le serveur de mail.");
    }

    const report: BackupReport = {
      takenAt: archive.takenAt,
      rows,
      tables: lines.length,
      bytes: file.length,
      sentTo: maskEmail(recipient),
      durationMs: Date.now() - started,
    };

    await prisma.jobRun.update({
      where: { id: run.id },
      data: { finishedAt: new Date(), succeeded: true, detail: report },
    });

    return report;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);

    await prisma.jobRun
      .update({
        where: { id: run.id },
        data: {
          finishedAt: new Date(),
          succeeded: false,
          detail: { error: reason },
        },
      })
      .catch(() => undefined);

    throw error;
  }
}

function mb(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(2);
}

/** The report is readable in the administration journal; the address is not. */
function maskEmail(address: string): string {
  const [name, domain] = address.split("@");
  return `${name.slice(0, 2)}***@${domain}`;
}

function escape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
