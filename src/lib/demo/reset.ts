import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { seedDemoProvider } from "@/lib/demo/seed";

/**
 * Put the demonstration back the way it was.
 *
 * The demo dashboard is a public door into a real account, which is what makes
 * it convincing and also what makes it drift: a visitor can cancel every
 * appointment, rename every service and empty the gallery, and the next
 * visitor would judge the product on the wreckage.
 *
 * Re-running the seed restores everything it upserts — services, settings,
 * hours, gallery, the lot. It does not restore the diary: seedAppointments and
 * seedHistory both bail out when the provider already has appointments, which
 * is right for a seed and wrong for a reset. So the appointments go first, and
 * the seed rebuilds them.
 *
 * Sessions opened through the demo door are revoked in the same pass. They are
 * ordinary sessions on a real account, and leaving them live means someone who
 * pressed the button last week still has a dashboard open on data that has
 * since been rebuilt under them.
 */

export type DemoResetReport = {
  ran: boolean;
  appointmentsRemoved: number;
  sessionsRevoked: number;
};

export async function resetDemo(): Promise<DemoResetReport> {
  const slug = env().DEMO_SLUG;
  const email = env().DEMO_EMAIL;

  // No demo configured is not a failure; it means this installation does not
  // have one, and the scheduled call should say so and stop.
  if (!slug || !email) {
    return { ran: false, appointmentsRemoved: 0, sessionsRevoked: 0 };
  }

  const provider = await prisma.provider.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!provider) {
    return { ran: false, appointmentsRemoved: 0, sessionsRevoked: 0 };
  }

  // Scoped to the one provider by id, never by a filter that could widen.
  const removed = await prisma.appointment.deleteMany({
    where: { providerId: provider.id },
  });

  const revoked = await prisma.session.updateMany({
    where: { user: { email }, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  await seedDemoProvider();

  return {
    ran: true,
    appointmentsRemoved: removed.count,
    sessionsRevoked: revoked.count,
  };
}
