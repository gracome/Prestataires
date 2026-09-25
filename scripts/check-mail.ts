/**
 * Send one real message through the configured mail driver.
 *
 * A wrong API key, a sender address the provider refuses or a driver still on
 * "console" all look the same from the outside: the application runs, and no
 * confirmation ever reaches a client. This makes the failure visible now.
 *
 *   npm run mail:check -- destinataire@exemple.com
 */

import { sendMail } from "../src/lib/email/mailer";
import { env } from "../src/lib/env";

async function main(): Promise<void> {
  const to = process.argv[2];
  if (!to) {
    console.error("Usage : npm run mail:check -- destinataire@exemple.com");
    process.exitCode = 1;
    return;
  }

  const config = env();
  console.log(`driver      : ${config.MAIL_DRIVER}`);
  console.log(`expéditeur  : ${config.MAIL_FROM}`);
  console.log(`destinataire: ${to}\n`);

  if (config.MAIL_DRIVER === "console") {
    console.log(
      "MAIL_DRIVER vaut \"console\" : le message est écrit ci-dessous et " +
        "n'est envoyé à personne.\n",
    );
  }

  const result = await sendMail({
    to,
    subject: "Test d'envoi — Prestataire",
    text:
      "Si vous lisez ce message, la configuration e-mail fonctionne.\n\n" +
      "Les confirmations de réservation et les rappels emprunteront ce chemin.",
    html:
      "<p>Si vous lisez ce message, la configuration e-mail fonctionne.</p>" +
      "<p>Les confirmations de réservation et les rappels emprunteront ce chemin.</p>",
  });

  if (!result.ok) {
    console.error(`Échec : ${result.error ?? "raison inconnue"}`);
    process.exitCode = 1;
    return;
  }

  console.log("Message accepté par le fournisseur.");
  if (config.MAIL_DRIVER !== "console") {
    console.log("Vérifier la boîte de réception, indésirables compris.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
