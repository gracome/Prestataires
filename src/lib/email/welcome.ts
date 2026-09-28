import { renderEmail, type Block } from "./layout";
import type { RenderedEmail } from "./templates";

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
  primaryColor?: string;
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
    businessName: input.businessName,
    primaryColor: input.primaryColor,
    blocks,
    footerNote:
      "Vous recevez ce message parce qu'un espace professionnel vient d'être créé à votre nom. Si vous n'attendiez rien de tel, ignorez-le et prévenez-nous.",
  });

  return { subject: `Vos identifiants — ${input.businessName}`, ...rendered };
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
    businessName: input.businessName,
    primaryColor: input.primaryColor,
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
