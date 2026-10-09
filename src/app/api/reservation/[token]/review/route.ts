import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getBookingByToken } from "@/lib/booking/customer-view";
import { reviewSchema } from "@/lib/validation";
import { canLeaveReview, publicReviewerName } from "@/lib/reviews";
import { clientIp, LIMITS, rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/reservation/{token}/review
 *
 * The customer's rating and comment, once her appointment is behind her.
 * Holding the booking's token is the proof she was a customer; the unique
 * index on the appointment is what makes "once" true.
 */

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;

  const ip = clientIp(request.headers);
  const limit = rateLimit(`review:${ip}`, LIMITS.review.limit, LIMITS.review.windowSeconds);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Trop de tentatives depuis cet appareil. Réessayez plus tard." },
      { status: 429 },
    );
  }

  const booking = await getBookingByToken(token);
  if (!booking) {
    return NextResponse.json({ error: "Réservation introuvable." }, { status: 404 });
  }

  if (booking.review) {
    return NextResponse.json({ error: "Vous avez déjà laissé votre avis. Merci !" }, { status: 409 });
  }
  if (!canLeaveReview(booking)) {
    return NextResponse.json(
      { error: "Vous pourrez laisser votre avis une fois votre rendez-vous passé." },
      { status: 409 },
    );
  }

  let payload: unknown = {};
  try {
    payload = await request.json();
  } catch {
    // Validation below reports the missing fields.
  }

  const parsed = reviewSchema.safeParse(payload ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Avis incomplet." },
      { status: 400 },
    );
  }

  try {
    await prisma.review.create({
      data: {
        providerId: booking.providerId,
        appointmentId: booking.id,
        serviceId: booking.serviceId,
        customerName: publicReviewerName(booking.customerName),
        rating: parsed.data.rating,
        comment: parsed.data.comment,
      },
    });
  } catch (error) {
    // Two submissions racing past the check above: the index refuses the
    // second, which is the right outcome, not an error worth showing.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ ok: true });
    }
    throw error;
  }

  // Her words appear on the site straight away, not after the page cache.
  revalidatePath(`/${booking.provider.slug}`);

  return NextResponse.json({ ok: true });
}
