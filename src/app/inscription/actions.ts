"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth/session";
import { appUrl } from "@/lib/env";
import { sendMail } from "@/lib/email/mailer";
import { providerSignedUp } from "@/lib/email/welcome";
import { PLANS } from "@/lib/plans/catalogue";
import {
  createProvider,
  freeSlug,
  PlatformError,
} from "@/lib/platform/providers";
import { clientIp, LIMITS, rateLimit } from "@/lib/rate-limit";
import { fieldErrors, signUpSchema, type ActionState } from "@/lib/validation";
import type { ActivityId } from "@/lib/platform/activities";
import type { Plan } from "@prisma/client";

/**
 * Opening an account from the public page.
 *
 * Until now an account could only be created by a platform administrator, on
 * an admin screen, with the password posted to the new owner. That path stays
 * exactly as it is: it is the right one for an account somebody else sets up,
 * and it is how a provider who telephones rather than types still gets in.
 *
 * What this adds is the other half. Somebody convinced at eleven at night is
 * not going to wait until the morning for an answer, and the number of
 * accounts an administrator can type out by hand is not a number a platform
 * can grow to.
 *
 * Three things are deliberately the same as the administrator path, because
 * an account must not depend on which door it came through: it is created by
 * `createProvider`, so it gets the same catalogue, colours, opening hours and
 * draft status; it starts unpublished, so nothing is visible until she
 * publishes it herself; and the password is never stored in the clear.
 *
 * Two things are deliberately different. She chooses her own password, so it
 * is never written into an email, and the letter she gets afterwards carries
 * no credentials at all. And she picks her package here, because the guard
 * reads it to decide which screens exist: an account opened on the wrong one
 * shows her a dashboard with half its doors locked on the first morning.
 *
 * Payment is not asked for at this step and the account is not billed yet:
 * `subscriptionEndsAt` stays null, which the scheduled job reads as an
 * account still being set up and leaves alone. The money question belongs to
 * publication, which is the moment the product starts being worth something.
 */
export async function signUpAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const requestHeaders = await headers();
  const ip = clientIp(requestHeaders);

  const limit = rateLimit(
    `signup:${ip}`,
    LIMITS.signUp.limit,
    LIMITS.signUp.windowSeconds,
  );

  if (!limit.allowed) {
    return {
      status: "error",
      message: `Trop de tentatives. Réessayez dans ${Math.ceil(limit.retryAfterSeconds / 60)} minutes.`,
    };
  }

  const parsed = signUpSchema.safeParse({
    businessName: String(formData.get("businessName") ?? ""),
    ownerName: String(formData.get("ownerName") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    city: String(formData.get("city") ?? ""),
    activity: String(formData.get("activity") ?? "autre"),
    plan: String(formData.get("plan") ?? "RENDEZ_VOUS"),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Merci de corriger les champs signalés.",
      errors: fieldErrors(parsed.error),
    };
  }

  const input = parsed.data;

  // Checked before the write so the answer names the field, rather than
  // surfacing a unique-constraint violation from the database.
  const emailTaken = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });

  if (emailTaken) {
    return {
      status: "error",
      message: "Un compte utilise déjà cette adresse.",
      errors: {
        email: "Cette adresse a déjà un compte. Connectez-vous.",
      },
    };
  }

  let created;

  try {
    created = await createProvider({
      businessName: input.businessName,
      ownerName: input.ownerName,
      email: input.email,
      slug: await freeSlug(input.businessName),
      phone: input.phone,
      whatsappPhone: input.phone,
      city: input.city,
      country: "Bénin",
      activity: input.activity as ActivityId,
      plan: input.plan as Plan,
      password: input.password,
      // She chose this password. Posting it back to her would put in a
      // mailbox the one value the database refuses to keep.
      sendWelcomeEmail: false,
    });
  } catch (error) {
    if (error instanceof PlatformError) {
      return {
        status: "error",
        message: error.message,
        errors: error.field ? { [error.field]: error.message } : undefined,
      };
    }
    throw error;
  }

  // The letter is not allowed to fail the sign-up: the account exists and she
  // is about to be inside it, so a mail server hiccup must not undo that.
  try {
    const letter = providerSignedUp({
      businessName: created.provider.businessName,
      ownerName: created.provider.ownerName,
      email: created.email,
      planName: PLANS[created.provider.plan].name,
      loginUrl: appUrl("/login"),
      siteUrl: appUrl(`/${created.provider.slug}`),
    });

    await sendMail({
      to: created.email,
      subject: letter.subject,
      html: letter.html,
      text: letter.text,
    });
  } catch {
    // Swallowed on purpose. She is signed in on the next line and the address
    // of her site is on screen; the letter is a convenience, not the account.
  }

  const owner = await prisma.user.findUniqueOrThrow({
    where: { email: created.email },
    select: { id: true, providerId: true },
  });

  await createSession(owner.id, {
    userAgent: requestHeaders.get("user-agent"),
    ipAddress: ip,
  });

  await prisma.auditLog.create({
    data: {
      providerId: owner.providerId,
      userId: owner.id,
      action: "auth.signup",
      entityType: "Provider",
      entityId: created.provider.id,
      ipAddress: ip,
      metadata: { plan: created.provider.plan, activity: input.activity },
    },
  });

  redirect("/dashboard?bienvenue=1");
}
