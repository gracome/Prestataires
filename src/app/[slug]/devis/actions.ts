"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { fieldErrors, quoteRequestSchema, type ActionState } from "@/lib/validation";
import { clientIp, LIMITS, rateLimit } from "@/lib/rate-limit";
import {
  IMAGE_MIME_TYPES,
  MAX_IMAGE_BYTES,
  mediaPrefix,
  putFile,
  StorageError,
} from "@/lib/storage";
import {
  dispatchInBackground,
  notifyQuoteRequest,
} from "@/lib/notifications/dispatch";
import { localDateTimeToUtc } from "@/lib/time";
import { RESERVED_SLUGS } from "@/lib/providers/public-site";
import { computeEstimate, parseAnswers } from "@/lib/quotes/estimate";
import { loadEstimatorConfig } from "@/lib/quotes/config";

/**
 * Quote requests (cahier des charges section 18).
 *
 * The estimate stored on the request is recomputed here from the provider's
 * own configuration. The browser shows a live figure for responsiveness, but
 * nothing it sends is trusted: a customer editing the form cannot pin a price.
 */

export async function submitQuoteRequest(
  slug: string,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (RESERVED_SLUGS.has(slug.toLowerCase())) {
    return { status: "error", message: "Prestataire introuvable." };
  }

  const requestHeaders = await headers();
  const limit = rateLimit(
    `quote:${clientIp(requestHeaders)}`,
    LIMITS.quoteRequest.limit,
    LIMITS.quoteRequest.windowSeconds,
  );

  if (!limit.allowed) {
    return {
      status: "error",
      message: "Trop de demandes envoyées. Réessayez un peu plus tard.",
    };
  }

  const parsed = quoteRequestSchema.safeParse({
    serviceId: emptyToUndefined(formData.get("serviceId")),
    customerName: String(formData.get("customerName") ?? ""),
    customerPhone: String(formData.get("customerPhone") ?? ""),
    customerEmail: String(formData.get("customerEmail") ?? ""),
    description: String(formData.get("description") ?? ""),
    budgetAmount: emptyToUndefined(formData.get("budgetAmount")),
    preferredDate: emptyToUndefined(formData.get("preferredDate")),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Merci de vérifier les informations saisies.",
      errors: fieldErrors(parsed.error),
    };
  }

  const provider = await prisma.provider.findFirst({
    where: { slug: slug.toLowerCase(), status: "ACTIVE" },
    select: { id: true, timezone: true },
  });

  if (!provider) {
    return { status: "error", message: "Prestataire introuvable." };
  }

  // A service id from the form must belong to this provider.
  let serviceId: string | null = null;
  if (parsed.data.serviceId) {
    const service = await prisma.service.findFirst({
      where: { id: parsed.data.serviceId, providerId: provider.id },
      select: { id: true },
    });
    serviceId = service?.id ?? null;
  }

  // Recompute the estimate rather than reading any figure from the payload.
  const config = await loadEstimatorConfig(provider.id);
  const estimate = config
    ? computeEstimate(config, parseAnswers(formData.entries()))
    : null;

  if (estimate && !estimate.complete) {
    return {
      status: "error",
      message: `Merci de répondre à : ${estimate.missing.join(", ")}.`,
    };
  }

  let attachmentKey: string | null = null;
  const photo = formData.get("photo");

  if (photo instanceof File && photo.size > 0) {
    try {
      const bytes = new Uint8Array(await photo.arrayBuffer());
      const stored = await putFile(bytes, {
        prefix: `${mediaPrefix(provider.id)}/quotes`,
        allowedMimeTypes: IMAGE_MIME_TYPES,
        maxBytes: MAX_IMAGE_BYTES,
        declaredMimeType: photo.type,
      });
      attachmentKey = stored.key;
    } catch (error) {
      if (error instanceof StorageError) {
        return {
          status: "error",
          message: error.message,
          errors: { photo: error.message },
        };
      }
      throw error;
    }
  }

  const quote = await prisma.quoteRequest.create({
    data: {
      providerId: provider.id,
      serviceId,
      customerName: parsed.data.customerName,
      customerPhone: parsed.data.customerPhone,
      customerEmail: parsed.data.customerEmail ?? null,
      description: parsed.data.description,
      budgetAmount: parsed.data.budgetAmount ?? null,
      preferredDate: parsed.data.preferredDate
        ? localDateTimeToUtc(parsed.data.preferredDate, 12 * 60, provider.timezone)
        : null,
      attachmentKey,
      estimateMin: estimate?.min ?? null,
      estimateMax: estimate?.max ?? null,
      estimateMinutes: estimate?.durationMinutes ?? null,
      // Stored as labels, so the provider still reads the request after she
      // renames or deletes a question.
      estimateAnswers: estimate?.lines.length ? estimate.lines : undefined,
    },
    select: { id: true },
  });

  dispatchInBackground(() => notifyQuoteRequest(quote.id), `quote ${quote.id}`);

  return {
    status: "success",
    message: estimate?.complete
      ? "Votre demande est partie avec votre estimation. Vous serez recontactée très prochainement pour confirmer le tarif exact."
      : "Votre demande a bien été envoyée. Vous serez recontactée très prochainement.",
  };
}

function emptyToUndefined(value: FormDataEntryValue | null): string | undefined {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : undefined;
}
