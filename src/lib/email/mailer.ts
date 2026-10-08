import { env } from "@/lib/env";

/**
 * Transactional email delivery.
 *
 * Three drivers: `console` prints the message (development and tests), `smtp`
 * uses nodemailer, `resend` posts to the Resend API. The rest of the app only
 * ever sees `sendMail`, so swapping provider is a configuration change.
 */

export type MailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  /**
   * Display name shown as the sender, in place of the one in MAIL_FROM. The
   * address stays the platform's: only a domain we have authenticated can
   * send without landing in spam, so a provider lends her name, not her
   * mailbox. Replies reach her through `replyTo`.
   */
  fromName?: string;
};

export type MailResult = {
  ok: boolean;
  error?: string;
};

export async function sendMail(message: MailMessage): Promise<MailResult> {
  const config = env();

  try {
    switch (config.MAIL_DRIVER) {
      case "smtp":
        await sendViaSmtp(message);
        return { ok: true };
      case "resend":
        await sendViaResend(message);
        return { ok: true };
      default:
        sendToConsole(message);
        return { ok: true };
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function sendToConsole(message: MailMessage): void {

  console.info(
    [
      "",
      "--- email ---------------------------------------------------",
      `To:      ${message.to}`,
      `Subject: ${message.subject}`,
      "",
      message.text,
      "-------------------------------------------------------------",
    ].join("\n"),
  );
}

/**
 * The From header for one message: MAIL_FROM as configured, or its address
 * under another name.
 *
 * The name comes from what a provider typed as her business name, so line
 * breaks are dropped (a header must not be able to start another header) and
 * it is always quoted: "Fanny Beauty & Hair" or "Studio L.N." would otherwise
 * not be valid display names.
 */
export function senderFor(mailFrom: string, fromName?: string): string {
  const name = fromName?.replace(/\s+/g, " ").trim();
  if (!name) return mailFrom;

  const address = /<([^>]+)>/.exec(mailFrom)?.[1]?.trim() ?? mailFrom.trim();
  const quoted = name.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${quoted}" <${address}>`;
}

async function sendViaSmtp(message: MailMessage): Promise<void> {
  const config = env();
  if (!config.SMTP_HOST) {
    throw new Error("SMTP_HOST is not configured");
  }

  const nodemailer = await import("nodemailer");
  const transport = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT ?? 587,
    secure: config.SMTP_SECURE,
    auth: config.SMTP_USER
      ? { user: config.SMTP_USER, pass: config.SMTP_PASSWORD }
      : undefined,
  });

  await transport.sendMail({
    from: senderFor(config.MAIL_FROM, message.fromName),
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
    replyTo: message.replyTo,
  });
}

async function sendViaResend(message: MailMessage): Promise<void> {
  const config = env();
  if (!config.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: senderFor(config.MAIL_FROM, message.fromName),
      to: [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
      reply_to: message.replyTo,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Resend responded ${response.status}: ${detail.slice(0, 300)}`);
  }
}
