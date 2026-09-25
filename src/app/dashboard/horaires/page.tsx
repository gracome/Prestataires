import { Suspense } from "react";
import { requireSection } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import {
  dayLabelFr,
  formatLocalTime,
  formatLongDateFr,
  formatMinuteOfDay,
  toLocalDate,
} from "@/lib/time";
import {
  PageHeader,
  Section,
  SkeletonForm,
  SkeletonList,
} from "@/components/dashboard/ui";
import { WorkingHoursForm, type DayRow } from "@/components/dashboard/WorkingHoursForm";
import { TimeBlockManager, type BlockRow } from "@/components/dashboard/TimeBlockManager";

export const dynamic = "force-dynamic";

const DEFAULTS = { open: "09:00", close: "18:00" };

export default async function HorairesPage() {
  const { provider } = await requireSection("hours");

  return (
    <>
      <PageHeader
        title="Horaires et absences"
        description="Vos horaires hebdomadaires définissent les créneaux proposés. Les congés et créneaux bloqués les retirent ponctuellement."
      />

      <Suspense
        fallback={
          <>
            <Section title="Horaires hebdomadaires">
              <SkeletonForm rows={4} />
            </Section>
            <Section title="Congés et créneaux bloqués">
              <SkeletonList count={2} label="Chargement des indisponibilités…" />
            </Section>
          </>
        }
      >
        <HorairesContent providerId={provider.id} />
      </Suspense>
    </>
  );
}

async function HorairesContent({ providerId }: { providerId: string }) {
  const provider = await prisma.provider.findUniqueOrThrow({
    where: { id: providerId },
  });
  const tz = provider.timezone;
  const now = new Date();

  const [workingHours, blocks] = await Promise.all([
    prisma.workingHours.findMany({ where: { providerId: provider.id } }),
    prisma.timeBlock.findMany({
      where: { providerId: provider.id, endsAt: { gte: now } },
      orderBy: { startsAt: "asc" },
      take: 60,
    }),
  ]);

  const byDay = new Map(workingHours.map((wh) => [wh.dayOfWeek, wh]));

  const days: DayRow[] = Array.from({ length: 7 }, (_, dayOfWeek) => {
    const rule = byDay.get(dayOfWeek);
    return {
      dayOfWeek,
      label: dayLabelFr(dayOfWeek),
      active: rule?.active ?? false,
      open: rule ? formatMinuteOfDay(rule.openMinute) : DEFAULTS.open,
      close: rule ? formatMinuteOfDay(rule.closeMinute) : DEFAULTS.close,
      breakStart:
        rule?.breakStartMinute != null ? formatMinuteOfDay(rule.breakStartMinute) : null,
      breakEnd:
        rule?.breakEndMinute != null ? formatMinuteOfDay(rule.breakEndMinute) : null,
    };
  });

  const blockRows: BlockRow[] = blocks.map((block) => ({
    id: block.id,
    type: block.type,
    label: block.reason ?? "",
    range: block.allDay
      ? sameDay(block.startsAt, block.endsAt, tz)
        ? formatLongDateFr(block.startsAt, tz)
        : `${formatLongDateFr(block.startsAt, tz)} → ${formatLongDateFr(new Date(block.endsAt.getTime() - 60_000), tz)}`
      : `${formatLongDateFr(block.startsAt, tz)} · ${formatLocalTime(block.startsAt, tz)} – ${formatLocalTime(block.endsAt, tz)}`,
    reason: block.reason,
    editable: block.type !== "EXTERNAL_CALENDAR",
  }));

  return (
    <>
      <Section
        title="Horaires hebdomadaires"
        description={`Heures locales de ${provider.timezone}.`}
      >
        <WorkingHoursForm days={days} />
      </Section>

      <Section
        title="Congés et créneaux bloqués"
        description="Ces périodes sont retirées des disponibilités proposées à vos clientes."
      >
        <TimeBlockManager blocks={blockRows} today={toLocalDate(now, tz)} />
      </Section>
    </>
  );
}

function sameDay(start: Date, end: Date, timezone: string): boolean {
  // An all-day block ends at midnight the next morning, so the last covered
  // day is one minute before the end.
  const lastMoment = new Date(end.getTime() - 60_000);
  return toLocalDate(start, timezone) === toLocalDate(lastMoment, timezone);
}
