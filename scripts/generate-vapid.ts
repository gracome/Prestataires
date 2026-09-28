/**
 * Generate the VAPID key pair that identifies this application to the
 * browsers' push services.
 *
 *   npm run push:keys
 *
 * Run once per installation. The pair is an identity, not a rotating secret:
 * changing it invalidates every subscription already granted, and every
 * browser would have to be asked again.
 */

import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();

console.log("\nAjoutez ces lignes à votre .env, puis aux variables Vercel :\n");
console.log(`VAPID_PUBLIC_KEY="${keys.publicKey}"`);
console.log(`VAPID_PRIVATE_KEY="${keys.privateKey}"`);
console.log('VAPID_SUBJECT="mailto:votre@adresse.com"');
console.log(
  "\nLa clé publique part dans le navigateur ; la privée ne doit jamais " +
    "sortir du serveur.\n",
);
