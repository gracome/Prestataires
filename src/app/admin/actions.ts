"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { requirePlatformAdminApi } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import {
  createSession,
  destroySession,
  getSessionContext,
} from "@/lib/auth/session";
import {
  PlatformError,
  createProvider,
  resetProviderPassword,
  setProviderStatus,
} from "@/lib/platform/providers";
import { getActivity, isActivityId } from "@/lib/platform/activities";

/**
 * Platform administration.
 *
 * Every action here goes through `requirePlatformAdminApi` and writes an audit
 * entry. An administrator's power over a provider account is real, so it is
 * never silent: the trail is what makes it acceptable to hold that power.
 */

export type ActionState =
  | { status: "idle" }
  | { status: "error"; message: string; field?: string }
  | { status: "success"; message: string; secret?: { email: string; password: string } };

async function clientIp(): Promise<string | null> {
  const list = await headers();
  const forwarded = list.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() ?? null;
}

async function record(
  adminId: string,
  action: string,
  providerId: string | null,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      providerId,
      userId: adminId,
      action,
      entityType: "Provider",
      entityId: providerId,
      metadata: metadata as never,
      ipAddress: await clientIp(),
    },
  });
}

// ---------------------------------------------------------------------------

const HEX = /^#[0-9a-fA-F]{6}$/;
const colour = z.string().regex(HEX, "Couleur invalide.").optional().or(z.literal(""));

const createSchema = z.object({
  businessName: z.string().min(2, "Le nom de l'activité est requis."),
  ownerName: z.string().min(2, "Le nom de la responsable est requis."),
  email: z.string().email("Adresse e-mail invalide."),
  slug: z.string().optional(),
  phone: z.string().optional(),
  whatsappPhone: z.string().optional(),
  addressLine: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  activity: z.string().optional(),
  tagline: z.string().optional(),
  description: z.string().optional(),
  primaryColor: colour,
  accentColor: colour,
  backgroundColor: colour,
  seedCatalogue: z.string().optional(),
});

export async function createProviderAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { admin } = await requirePlatformAdminApi();

  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      status: "error",
      message: issue.message,
      field: String(issue.path[0] ?? ""),
    };
  }

  const activity = isActivityId(parsed.data.activity ?? "")
    ? parsed.data.activity
    : undefined;

  // An empty colour field means "keep the trade's own", not "black".
  const palette = Object.fromEntries(
    (
      ["primaryColor", "accentColor", "backgroundColor"] as const
    )
      .map((key) => [key, parsed.data[key]])
      .filter(([, value]) => typeof value === "string" && value !== ""),
  );

  try {
    const created = await createProvider({
      ...parsed.data,
      activity: activity as never,
      palette,
      // An unchecked checkbox is simply absent from the form data.
      seedCatalogue: parsed.data.seedCatalogue === "on",
    });

    await record(admin.id, "platform.provider.created", created.provider.id, {
      slug: created.provider.slug,
      businessName: created.provider.businessName,
      activity: getActivity(activity).label,
    });

    revalidatePath("/admin/prestataires");
    revalidatePath("/admin");

    return {
      status: "success",
      message: `${created.provider.businessName} est créée. Transmettez ce mot de passe par un canal privé, il ne sera plus affiché.`,
      secret: { email: created.email, password: created.password },
    };
  } catch (error) {
    if (error instanceof PlatformError) {
      return { status: "error", message: error.message, field: error.field };
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------

const statusSchema = z.object({
  providerId: z.string().min(1),
  status: z.enum(["ACTIVE", "DRAFT", "SUSPENDED"]),
});

export async function setStatusAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { admin } = await requirePlatformAdminApi();

  const parsed = statusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "Requête invalide." };
  }

  const provider = await prisma.provider.findUnique({
    where: { id: parsed.data.providerId },
    select: { id: true, businessName: true, status: true },
  });
  if (!provider) return { status: "error", message: "Activité introuvable." };

  await setProviderStatus(provider.id, parsed.data.status);
  await record(admin.id, "platform.provider.status", provider.id, {
    from: provider.status,
    to: parsed.data.status,
  });

  revalidatePath(`/admin/prestataires/${provider.id}`);
  revalidatePath("/admin/prestataires");
  revalidatePath("/admin");

  const wording: Record<string, string> = {
    ACTIVE: "réactivée",
    DRAFT: "repassée en brouillon",
    SUSPENDED: "suspendue, ses sessions ont été fermées",
  };

  return {
    status: "success",
    message: `${provider.businessName} est ${wording[parsed.data.status]}.`,
  };
}

// ---------------------------------------------------------------------------

export async function resetPasswordAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { admin } = await requirePlatformAdminApi();

  const providerId = String(formData.get("providerId") ?? "");
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { id: true, businessName: true },
  });
  if (!provider) return { status: "error", message: "Activité introuvable." };

  try {
    const reset = await resetProviderPassword(provider.id);
    await record(admin.id, "platform.provider.password_reset", provider.id);

    return {
      status: "success",
      message:
        "Nouveau mot de passe généré. Les sessions ouvertes ont été fermées. Il ne sera plus affiché.",
      secret: reset,
    };
  } catch (error) {
    if (error instanceof PlatformError) {
      return { status: "error", message: error.message };
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------

/**
 * Open a support session on a provider's account.
 *
 * The administrator's own session is closed first, so there is never a moment
 * where one browser holds both. Coming back out means signing in again, which
 * is a deliberate friction: borrowing an account should not feel like a tab.
 */
export async function impersonateAction(formData: FormData): Promise<void> {
  const { admin } = await requirePlatformAdminApi();

  const providerId = String(formData.get("providerId") ?? "");
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { id: true, businessName: true },
  });
  if (!provider) throw new Error("Activité introuvable.");

  const target = await prisma.user.findFirst({
    where: { providerId: provider.id, role: "PROVIDER", active: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true },
  });
  if (!target) throw new Error("Cette activité n'a aucun compte actif.");

  await record(admin.id, "platform.impersonation.started", provider.id, {
    targetUserId: target.id,
    targetEmail: target.email,
  });

  const list = await headers();
  await destroySession();
  await createSession(target.id, {
    userAgent: list.get("user-agent"),
    ipAddress: await clientIp(),
    impersonatorId: admin.id,
  });

  redirect("/dashboard");
}

/**
 * End a support session and return to the sign-in screen.
 *
 * No platform guard here on purpose: while borrowed, the session belongs to
 * the provider, and the guard would refuse the very person trying to step back
 * out. Destroying the session revokes it, which is what closes the visit in
 * the record the provider reads.
 */
export async function stopImpersonationAction(): Promise<void> {
  const context = await getSessionContext();

  if (context?.impersonator) {
    await prisma.auditLog.create({
      data: {
        providerId: context.user.providerId,
        userId: context.impersonator.id,
        action: "platform.impersonation.ended",
        entityType: "Provider",
        entityId: context.user.providerId,
        ipAddress: await clientIp(),
      },
    });
  }

  await destroySession();
  redirect("/login?next=%2Fadmin");
}

// ---------------------------------------------------------------------------

const updateSchema = z.object({
  providerId: z.string().min(1),
  businessName: z.string().min(2, "Le nom de l'activité est requis."),
  ownerName: z.string().min(2, "Le nom de la responsable est requis."),
  tagline: z.string().optional(),
  description: z.string().optional(),
  phone: z.string().optional(),
  whatsappPhone: z.string().optional(),
  addressLine: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  primaryColor: colour,
  secondaryColor: colour,
  accentColor: colour,
  backgroundColor: colour,
});

/**
 * Edit a provider's account from the platform.
 *
 * Her identity, her contact details, her locale and her palette: the account's
 * own configuration, which the platform is entitled to set up for her. This is
 * not a hole in the data rule. Nothing here reads a customer, an appointment
 * or a payment, and reaching those still means opening a recorded session.
 */
export async function updateProviderAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { admin } = await requirePlatformAdminApi();

  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      status: "error",
      message: issue.message,
      field: String(issue.path[0] ?? ""),
    };
  }

  const data = parsed.data;
  const provider = await prisma.provider.findUnique({
    where: { id: data.providerId },
    select: { id: true, businessName: true },
  });
  if (!provider) return { status: "error", message: "Activité introuvable." };

  const text = (value: string | undefined) => value?.trim() || null;

  await prisma.provider.update({
    where: { id: provider.id },
    data: {
      businessName: data.businessName.trim(),
      ownerName: data.ownerName.trim(),
      tagline: text(data.tagline),
      description: text(data.description),
      phone: text(data.phone),
      whatsappPhone: text(data.whatsappPhone),
      addressLine: text(data.addressLine),
      city: text(data.city),
      country: text(data.country),
      timezone: data.timezone?.trim() || undefined,
      currency: data.currency?.trim().toUpperCase() || undefined,
    },
  });

  // Only the colours that were filled in are written, so clearing a field
  // leaves the current colour alone rather than blanking the site.
  const palette = Object.fromEntries(
    (["primaryColor", "secondaryColor", "accentColor", "backgroundColor"] as const)
      .map((key) => [key, data[key]])
      .filter(([, value]) => typeof value === "string" && value !== ""),
  );

  if (Object.keys(palette).length > 0) {
    await prisma.theme.upsert({
      where: { providerId: provider.id },
      create: { providerId: provider.id, ...palette },
      update: palette,
    });
  }

  await record(admin.id, "platform.provider.updated", provider.id, {
    businessName: data.businessName.trim(),
  });

  revalidatePath(`/admin/prestataires/${provider.id}`);
  revalidatePath("/admin/prestataires");

  return { status: "success", message: "Fiche enregistrée." };
}
