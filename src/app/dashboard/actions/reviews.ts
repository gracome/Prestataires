"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireProviderApi } from "@/lib/auth/guard";

/**
 * Hide or show one review on the public site.
 *
 * She cannot edit a customer's words, and she cannot delete them: hiding is
 * reversible, and a review that vanished for good would be the first thing a
 * customer who wrote it asks about.
 */
export async function setReviewHiddenAction(
  reviewId: string,
  hidden: boolean,
): Promise<{ status: "success" | "error"; message: string }> {
  const { provider } = await requireProviderApi("reviews");

  const updated = await prisma.review.updateMany({
    where: { id: reviewId, providerId: provider.id },
    data: { hidden },
  });

  if (updated.count === 0) return { status: "error", message: "Avis introuvable." };

  revalidatePath("/dashboard/avis");
  revalidatePath(`/${provider.slug}`);
  return { status: "success", message: hidden ? "Avis masqué." : "Avis affiché." };
}
