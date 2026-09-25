import type {
  Appointment,
  PaymentInstruction,
  Provider,
  QuoteRequest,
  Service,
} from "@prisma/client";
import { appUrl } from "@/lib/env";
import { formatMoney } from "@/lib/money";
import {
  formatDurationFr,
  formatLocalTime,
  formatLongDateFr,
} from "@/lib/time";
import { renderEmail, type Block } from "./layout";

/**
 * The V1 notification set (cahier des charges section 16), in French.
 *
 * Every template returns a subject plus an HTML and a plain-text body, and
 * takes the provider theme colour so the message matches the site.
 */

export type TemplateName =
  | "provider.booking.created"
  | "provider.booking.cancelled"
  | "provider.proof.submitted"
  | "provider.quote.received"
  | "customer.booking.awaiting_payment"
  | "customer.booking.confirmed"
  | "customer.payment.rejected"
  | "customer.booking.expired"
  | "customer.booking.cancelled"
  | "customer.reminder";

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

export type AppointmentContext = {
  provider: Provider;
  service: Service;
  appointment: Appointment;
  primaryColor?: string;
  paymentInstructions?: PaymentInstruction[];
  deadlineMinutes?: number;
};

function when(ctx: AppointmentContext): string {
  const tz = ctx.provider.timezone;
  return `${formatLongDateFr(ctx.appointment.startsAt, tz)} à ${formatLocalTime(ctx.appointment.startsAt, tz)}`;
}

function appointmentFacts(ctx: AppointmentContext): Array<[string, string]> {
  const { appointment, service, provider } = ctx;
  const rows: Array<[string, string]> = [
    ["Prestation", service.name],
    ["Date et heure", when(ctx)],
    ["Durée", formatDurationFr(service.durationMinutes)],
    ["Référence", appointment.reference],
  ];

  if (appointment.totalAmount > 0) {
    rows.push([
      "Montant total",
      formatMoney(appointment.totalAmount, appointment.currency, provider.locale),
    ]);
  }
  if (appointment.depositAmount > 0) {
    rows.push([
      "Acompte",
      formatMoney(appointment.depositAmount, appointment.currency, provider.locale),
    ]);
    rows.push([
      "Solde sur place",
      formatMoney(appointment.balanceAmount, appointment.currency, provider.locale),
    ]);
  }
  return rows;
}

function customerLink(appointment: Appointment): string {
  return appUrl(`/reservation/${appointment.accessToken}`);
}

function providerLink(appointment: Appointment): string {
  return appUrl(`/dashboard/reservations/${appointment.id}`);
}

// ---------------------------------------------------------------------------
// Provider-facing
// ---------------------------------------------------------------------------

export function providerBookingCreated(
  ctx: AppointmentContext,
): RenderedEmail {
  const { appointment, provider } = ctx;
  const needsDeposit = appointment.depositAmount > 0;

  const blocks: Block[] = [
    {
      kind: "paragraph",
      text: needsDeposit
        ? `${appointment.customerName} vient de réserver un créneau et doit maintenant envoyer son acompte.`
        : `${appointment.customerName} vient de réserver un créneau. Le rendez-vous est confirmé.`,
    },
    { kind: "facts", rows: appointmentFacts(ctx) },
    {
      kind: "facts",
      rows: [
        ["Cliente", appointment.customerName],
        ["Téléphone", appointment.customerPhone],
        ...(appointment.customerEmail
          ? ([["Email", appointment.customerEmail]] as Array<[string, string]>)
          : []),
      ],
    },
  ];

  if (appointment.customerNote) {
    blocks.push({ kind: "callout", text: `Message : ${appointment.customerNote}` });
  }

  blocks.push({
    kind: "button",
    label: "Ouvrir la réservation",
    url: providerLink(appointment),
  });

  const rendered = renderEmail({
    title: "Nouvelle demande de rendez-vous",
    preheader: `${appointment.customerName} — ${when(ctx)}`,
    businessName: provider.businessName,
    primaryColor: ctx.primaryColor,
    blocks,
  });

  return { subject: `Nouvelle demande de rendez-vous — ${when(ctx)}`, ...rendered };
}

export function providerBookingCancelled(
  ctx: AppointmentContext,
): RenderedEmail {
  const { appointment, provider } = ctx;
  const byCustomer = appointment.cancelledBy === "CUSTOMER";

  const blocks: Block[] = [
    {
      kind: "paragraph",
      text: byCustomer
        ? `${appointment.customerName} vient d'annuler son rendez-vous. Le créneau est de nouveau disponible à la réservation.`
        : `Le rendez-vous de ${appointment.customerName} a été annulé. Le créneau est de nouveau disponible.`,
    },
    { kind: "facts", rows: appointmentFacts(ctx) },
    {
      kind: "facts",
      rows: [
        ["Cliente", appointment.customerName],
        ["Téléphone", appointment.customerPhone],
      ],
    },
  ];

  if (appointment.cancellationReason) {
    blocks.push({ kind: "callout", text: `Motif : ${appointment.cancellationReason}` });
  }

  blocks.push({
    kind: "button",
    label: "Voir mon planning",
    url: appUrl("/dashboard/calendrier"),
  });

  const rendered = renderEmail({
    title: "Un rendez-vous a été annulé",
    preheader: `${appointment.customerName} — ${when(ctx)}`,
    businessName: provider.businessName,
    primaryColor: ctx.primaryColor,
    blocks,
  });

  return {
    subject: `Rendez-vous annulé — ${appointment.customerName}, ${when(ctx)}`,
    ...rendered,
  };
}

export function providerProofSubmitted(
  ctx: AppointmentContext,
): RenderedEmail {
  const { appointment, provider } = ctx;

  const rendered = renderEmail({
    title: "Une preuve de paiement vient d'être envoyée",
    preheader: `${appointment.customerName} — acompte à vérifier`,
    businessName: provider.businessName,
    primaryColor: ctx.primaryColor,
    blocks: [
      {
        kind: "paragraph",
        text: `${appointment.customerName} a envoyé une preuve de paiement pour son acompte. Vérifiez la réception sur votre compte, puis confirmez ou refusez la réservation.`,
      },
      { kind: "facts", rows: appointmentFacts(ctx) },
      ...(ctx.deadlineMinutes
        ? ([
            {
              kind: "callout",
              text: `Sans vérification de votre part sous ${formatDurationFr(ctx.deadlineMinutes)}, la réservation expire et le créneau est libéré automatiquement.`,
            },
          ] as Block[])
        : []),
      {
        kind: "button",
        label: "Vérifier la preuve",
        url: providerLink(appointment),
      },
    ],
  });

  return {
    subject: `Preuve de paiement à vérifier — ${appointment.customerName}`,
    ...rendered,
  };
}

export function providerQuoteReceived(params: {
  provider: Provider;
  quote: QuoteRequest;
  service: Service | null;
  primaryColor?: string;
}): RenderedEmail {
  const { provider, quote, service } = params;

  const rows: Array<[string, string]> = [
    ["Cliente", quote.customerName],
    ["Téléphone", quote.customerPhone],
  ];
  if (quote.customerEmail) rows.push(["Email", quote.customerEmail]);
  if (service) rows.push(["Prestation", service.name]);
  if (quote.budgetAmount) {
    rows.push([
      "Budget indiqué",
      formatMoney(quote.budgetAmount, provider.currency, provider.locale),
    ]);
  }
  if (quote.preferredDate) {
    rows.push([
      "Date souhaitée",
      formatLongDateFr(quote.preferredDate, provider.timezone),
    ]);
  }

  const blocks: Block[] = [{ kind: "facts", rows }];

  // The estimate the customer was shown. Sending it here means the provider
  // answers knowing exactly what was announced, and never quotes below it by
  // accident.
  if (quote.estimateMin !== null && quote.estimateMax !== null) {
    const range =
      quote.estimateMin === quote.estimateMax
        ? formatMoney(quote.estimateMin, provider.currency, provider.locale)
        : `${formatMoney(quote.estimateMin, provider.currency, provider.locale)} à ${formatMoney(quote.estimateMax, provider.currency, provider.locale)}`;

    blocks.push({
      kind: "callout",
      text: `Estimation affichée à la cliente : ${range}${
        quote.estimateMinutes ? ` · environ ${formatDurationFr(quote.estimateMinutes)}` : ""
      }`,
    });
  }

  const answers = parseEstimateAnswers(quote.estimateAnswers);
  if (answers.length > 0) {
    blocks.push({ kind: "heading", text: "Ses choix" });
    blocks.push({
      kind: "facts",
      rows: answers.map((line) => [line.question, line.choice]),
    });
  }

  blocks.push({ kind: "heading", text: "Description du besoin" });
  blocks.push({ kind: "paragraph", text: quote.description });
  blocks.push({
    kind: "button",
    label: "Voir la demande",
    url: appUrl("/dashboard/devis"),
  });

  const rendered = renderEmail({
    title: "Nouvelle demande de devis",
    preheader: `${quote.customerName} souhaite un devis`,
    businessName: provider.businessName,
    primaryColor: params.primaryColor,
    blocks,
  });

  return { subject: `Demande de devis — ${quote.customerName}`, ...rendered };
}

export type EstimateAnswerLine = { question: string; choice: string };

/**
 * `estimateAnswers` is a JSON column, so its shape is only a promise. Anything
 * that does not look like a list of answers is dropped rather than rendered.
 */
export function parseEstimateAnswers(value: unknown): EstimateAnswerLine[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) return [];
    const line = entry as Record<string, unknown>;
    if (typeof line.question !== "string" || typeof line.choice !== "string") {
      return [];
    }
    return [{ question: line.question, choice: line.choice }];
  });
}

// ---------------------------------------------------------------------------
// Customer-facing
// ---------------------------------------------------------------------------

export function customerAwaitingPayment(
  ctx: AppointmentContext,
): RenderedEmail {
  const { appointment, provider } = ctx;
  const deposit = formatMoney(
    appointment.depositAmount,
    appointment.currency,
    provider.locale,
  );

  const blocks: Block[] = [
    {
      kind: "paragraph",
      text: `Bonjour ${appointment.customerName}, votre créneau est réservé pour le moment. Il sera confirmé dès réception de votre acompte.`,
    },
    { kind: "facts", rows: appointmentFacts(ctx) },
    { kind: "callout", text: `Acompte à envoyer : ${deposit}` },
  ];

  for (const instruction of ctx.paymentInstructions ?? []) {
    blocks.push({
      kind: "facts",
      rows: [
        ["Moyen de paiement", instruction.paymentMethod],
        ["Numéro", instruction.accountNumber],
        ["Nom du bénéficiaire", instruction.accountName],
      ],
    });
    if (instruction.instructions) {
      blocks.push({ kind: "paragraph", text: instruction.instructions });
    }
  }

  if (ctx.deadlineMinutes) {
    blocks.push({
      kind: "paragraph",
      text: `Sans preuve de paiement sous ${formatDurationFr(ctx.deadlineMinutes)}, le créneau sera automatiquement remis à disposition.`,
    });
  }

  blocks.push({
    kind: "button",
    label: "Envoyer ma preuve de paiement",
    url: customerLink(appointment),
  });

  const rendered = renderEmail({
    title: "Votre réservation est en attente de l'acompte",
    preheader: `Acompte de ${deposit} à envoyer`,
    businessName: provider.businessName,
    primaryColor: ctx.primaryColor,
    blocks,
  });

  return { subject: `Votre réservation du ${when(ctx)} — acompte à envoyer`, ...rendered };
}

export function customerConfirmed(ctx: AppointmentContext): RenderedEmail {
  const { appointment, provider } = ctx;

  const blocks: Block[] = [
    {
      kind: "paragraph",
      text: `Bonjour ${appointment.customerName}, votre rendez-vous est confirmé. À très bientôt !`,
    },
    { kind: "facts", rows: appointmentFacts(ctx) },
  ];

  if (provider.addressLine || provider.city) {
    blocks.push({
      kind: "facts",
      rows: [
        [
          "Adresse",
          [provider.addressLine, provider.city].filter(Boolean).join(", "),
        ],
      ],
    });
  }

  if (appointment.balanceAmount > 0) {
    blocks.push({
      kind: "callout",
      text: `Solde à régler sur place : ${formatMoney(appointment.balanceAmount, appointment.currency, provider.locale)}`,
    });
  }

  blocks.push({
    kind: "button",
    label: "Voir ma réservation",
    url: customerLink(appointment),
  });

  const rendered = renderEmail({
    title: "Votre rendez-vous est confirmé",
    preheader: when(ctx),
    businessName: provider.businessName,
    primaryColor: ctx.primaryColor,
    blocks,
  });

  return { subject: `Rendez-vous confirmé — ${when(ctx)}`, ...rendered };
}

export function customerPaymentRejected(
  ctx: AppointmentContext,
): RenderedEmail {
  const { appointment, provider } = ctx;

  const blocks: Block[] = [
    {
      kind: "paragraph",
      text: `Bonjour ${appointment.customerName}, votre réservation n'a pas pu être confirmée car l'acompte n'a pas pu être validé.`,
    },
    { kind: "facts", rows: appointmentFacts(ctx) },
  ];

  if (appointment.paymentRejectionReason) {
    blocks.push({
      kind: "callout",
      text: `Motif : ${appointment.paymentRejectionReason}`,
    });
  }

  blocks.push({
    kind: "paragraph",
    text: "Le créneau a été remis à disposition. Vous pouvez réserver à nouveau ou contacter la prestataire si vous pensez qu'il s'agit d'une erreur.",
  });

  if (provider.whatsappPhone) {
    blocks.push({
      kind: "facts",
      rows: [["WhatsApp", provider.whatsappPhone]],
    });
  }

  const rendered = renderEmail({
    title: "Votre réservation n'a pas pu être confirmée",
    preheader: "L'acompte n'a pas été validé",
    businessName: provider.businessName,
    primaryColor: ctx.primaryColor,
    blocks,
  });

  return { subject: "Votre réservation n'a pas pu être confirmée", ...rendered };
}

export function customerExpired(ctx: AppointmentContext): RenderedEmail {
  const { appointment, provider } = ctx;

  const rendered = renderEmail({
    title: "Votre réservation a expiré",
    preheader: "Le délai de confirmation a été dépassé",
    businessName: provider.businessName,
    primaryColor: ctx.primaryColor,
    blocks: [
      {
        kind: "paragraph",
        text: `Bonjour ${appointment.customerName}, votre réservation a expiré car le délai de confirmation a été dépassé. Le créneau est de nouveau disponible.`,
      },
      { kind: "facts", rows: appointmentFacts(ctx) },
      {
        kind: "button",
        label: "Réserver un nouveau créneau",
        url: appUrl(`/${provider.slug}/reservation`),
      },
    ],
  });

  return { subject: "Votre réservation a expiré", ...rendered };
}

export function customerCancelled(ctx: AppointmentContext): RenderedEmail {
  const { appointment, provider } = ctx;

  const blocks: Block[] = [
    {
      kind: "paragraph",
      text: `Bonjour ${appointment.customerName}, votre rendez-vous a été annulé.`,
    },
    { kind: "facts", rows: appointmentFacts(ctx) },
  ];

  if (appointment.cancellationReason) {
    blocks.push({ kind: "callout", text: `Motif : ${appointment.cancellationReason}` });
  }

  blocks.push({
    kind: "button",
    label: "Réserver un autre créneau",
    url: appUrl(`/${provider.slug}/reservation`),
  });

  const rendered = renderEmail({
    title: "Votre rendez-vous a été annulé",
    businessName: provider.businessName,
    primaryColor: ctx.primaryColor,
    blocks,
  });

  return { subject: "Votre rendez-vous a été annulé", ...rendered };
}

export function customerReminder(ctx: AppointmentContext): RenderedEmail {
  const { appointment, provider } = ctx;

  const blocks: Block[] = [
    {
      kind: "paragraph",
      text: `Bonjour ${appointment.customerName}, petit rappel pour votre rendez-vous.`,
    },
    { kind: "facts", rows: appointmentFacts(ctx) },
  ];

  if (provider.addressLine || provider.city) {
    blocks.push({
      kind: "facts",
      rows: [
        [
          "Adresse",
          [provider.addressLine, provider.city].filter(Boolean).join(", "),
        ],
      ],
    });
  }

  blocks.push({
    kind: "button",
    label: "Voir ma réservation",
    url: customerLink(appointment),
  });

  const rendered = renderEmail({
    title: "Rappel de votre rendez-vous",
    preheader: when(ctx),
    businessName: provider.businessName,
    primaryColor: ctx.primaryColor,
    blocks,
  });

  return { subject: `Rappel — votre rendez-vous ${when(ctx)}`, ...rendered };
}
