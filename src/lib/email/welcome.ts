import { renderEmail, type Block, type Signature } from "./layout";
import type { RenderedEmail } from "./templates";
import { CONTACT, PRODUCT } from "@/lib/marketing/product";

/**
 * These three letters come from us, not from her salon.
 *
 * So they wear the platform's name at the top and the platform's colour, and
 * they end on a telephone number. Everything else the product sends is a
 * message from a provider to her own customer and is signed by the provider;
 * mixing the two would mean a customer receiving her appointment confirmation
 * under our name.
 */
const SIGNATURE: Signature = {
  name: PRODUCT.name,
  line: PRODUCT.tagline,
  contact: `Une question ? ${CONTACT.phone}, ${CONTACT.city}, ${CONTACT.country}`,
};

/**
 * The letter a provider gets the day her account is created.
 *
 * It carries her password, which is the one and only time it exists in
 * readable form anywhere: the database holds a hash and nothing else, so if
 * this message is lost the password has to be regenerated rather than looked
 * up. The wording says so plainly, because someone who does not know that will
 * archive the mail and call for help three weeks later.
 *
 * Kept apart from `templates.ts`, which is entirely about appointments. This
 * one speaks to the provider about her account, not about a customer.
 */

export type WelcomeInput = {
  businessName: string;
  ownerName: string;
  email: string;
  /** Shown once. Never stored in the clear, here or anywhere. */
  password: string;
  /** Absolute address of the sign-in screen. */
  loginUrl: string;
  /** Absolute address of her public site, still a draft at this point. */
  siteUrl: string;
};

export function providerWelcome(input: WelcomeInput): RenderedEmail {
  const firstName = input.ownerName.trim().split(/\s+/)[0] || input.ownerName;

  const blocks: Block[] = [
    {
      kind: "paragraph",
      text: `Bonjour ${firstName}, votre espace ${input.businessName} est prêt. Voici de quoi vous connecter.`,
    },
    {
      kind: "facts",
      rows: [
        ["Identifiant", input.email],
        ["Mot de passe", input.password],
      ],
    },
    {
      kind: "callout",
      text: "Ce mot de passe ne vous sera pas renvoyé : il n'est enregistré nulle part en clair. Changez-le à votre première connexion, depuis Paramètres.",
    },
    { kind: "button", label: "Me connecter", url: input.loginUrl },
    { kind: "divider" },
    { kind: "heading", text: "Vos premières minutes" },
    {
      kind: "paragraph",
      text: "Votre site est créé mais pas encore en ligne. Vérifiez vos prestations et vos tarifs, réglez vos horaires d'ouverture, puis publiez-le depuis Paramètres quand vous êtes prête.",
    },
    {
      kind: "facts",
      rows: [["Adresse de votre site", input.siteUrl]],
    },
  ];

  const rendered = renderEmail({
    title: "Votre espace est prêt",
    preheader: `Vos identifiants pour ${input.businessName}`,
    businessName: PRODUCT.name,
    signature: SIGNATURE,
    blocks,
    footerNote:
      "Vous recevez ce message parce qu'un espace professionnel vient d'être créé à votre nom. Si vous n'attendiez rien de tel, ignorez-le et prévenez-nous.",
  });

  return { subject: `Vos identifiants pour ${input.businessName}`, ...rendered };
}

/**
 * The letter a provider gets when she opened the account herself.
 *
 * It carries no password, because she chose it and already knows it. Sending
 * it back would put in a mailbox the one thing the database deliberately does
 * not keep. What it does carry is where to go next: the account exists, the
 * site does not yet, and nothing happens until she publishes it.
 */
export function providerSignedUp(input: {
  businessName: string;
  ownerName: string;
  email: string;
  planName: string;
  loginUrl: string;
  siteUrl: string;
}): RenderedEmail {
  const firstName = input.ownerName.trim().split(/\s+/)[0] || input.ownerName;

  const blocks: Block[] = [
    {
      kind: "paragraph",
      text: `Bonjour ${firstName}, votre espace ${input.businessName} est ouvert. Vous vous connectez avec l'adresse ci-dessous et le mot de passe que vous venez de choisir.`,
    },
    {
      kind: "facts",
      rows: [
        ["Identifiant", input.email],
        ["Formule", input.planName],
      ],
    },
    { kind: "button", label: "Ouvrir mon espace", url: input.loginUrl },
    { kind: "divider" },
    { kind: "heading", text: "Vos premières minutes" },
    {
      kind: "paragraph",
      text: "Votre site est créé mais pas encore visible. Vérifiez vos prestations et vos tarifs, réglez vos horaires, ajoutez vos photos, puis publiez-le depuis Paramètres le jour où vous êtes prête.",
    },
    {
      kind: "facts",
      rows: [["Adresse de votre site", input.siteUrl]],
    },
    {
      kind: "callout",
      text: `Une question pendant la mise en route ? Écrivez-nous au ${CONTACT.phone}, on répond.`,
    },
  ];

  const rendered = renderEmail({
    title: "Votre espace est ouvert",
    preheader: `Bienvenue chez ${PRODUCT.name}`,
    businessName: PRODUCT.name,
    signature: SIGNATURE,
    blocks,
    footerNote:
      "Vous recevez ce message parce qu'un espace professionnel vient d'être ouvert avec cette adresse. Si ce n'est pas vous, prévenez-nous.",
  });

  return { subject: `Bienvenue chez ${PRODUCT.name}`, ...rendered };
}

/**
 * The same letter after a password reset.
 *
 * Deliberately not the welcome one: someone whose password was reset without
 * asking needs to be told it happened, not congratulated on a new account.
 */
export function providerPasswordReset(
  input: Omit<WelcomeInput, "siteUrl">,
): RenderedEmail {
  const firstName = input.ownerName.trim().split(/\s+/)[0] || input.ownerName;

  const rendered = renderEmail({
    title: "Votre mot de passe a été réinitialisé",
    preheader: `Nouveau mot de passe pour ${input.businessName}`,
    businessName: PRODUCT.name,
    signature: SIGNATURE,
    blocks: [
      {
        kind: "paragraph",
        text: `Bonjour ${firstName}, le mot de passe de votre espace vient d'être réinitialisé. L'ancien ne fonctionne plus et vos sessions ouvertes ont été fermées.`,
      },
      {
        kind: "facts",
        rows: [
          ["Identifiant", input.email],
          ["Nouveau mot de passe", input.password],
        ],
      },
      {
        kind: "callout",
        text: "Changez-le à votre prochaine connexion, depuis Paramètres. Si vous n'êtes pas à l'origine de cette réinitialisation, prévenez-nous immédiatement.",
      },
      { kind: "button", label: "Me connecter", url: input.loginUrl },
    ],
  });

  return {
    subject: `Nouveau mot de passe — ${input.businessName}`,
    ...rendered,
  };
}

/**
 * Her sign-in address was changed by the platform.
 *
 * Sent to the new address, so the first thing that reaches it is the news that
 * it is now her identifier. Her password is untouched and not repeated here:
 * this letter proves the address works, it does not hand out access.
 */
export function providerEmailChanged(input: {
  businessName: string;
  ownerName: string;
  email: string;
  loginUrl: string;
}): RenderedEmail {
  const firstName = input.ownerName.trim().split(/\s+/)[0] || input.ownerName;

  const rendered = renderEmail({
    title: "Votre adresse de connexion a changé",
    preheader: `Vous vous connectez désormais avec ${input.email}`,
    businessName: PRODUCT.name,
    signature: SIGNATURE,
    blocks: [
      {
        kind: "paragraph",
        text: `Bonjour ${firstName}, l'adresse e-mail de votre espace vient d'être modifiée. C'est désormais celle-ci qui vous sert d'identifiant, et où vous recevez vos notifications de réservation.`,
      },
      { kind: "facts", rows: [["Identifiant", input.email]] },
      {
        kind: "callout",
        text: "Votre mot de passe ne change pas. Si vous n'êtes pas à l'origine de cette modification, prévenez-nous immédiatement.",
      },
      { kind: "button", label: "Me connecter", url: input.loginUrl },
    ],
  });

  return { subject: `Votre adresse de connexion a changé · ${input.businessName}`, ...rendered };
}
