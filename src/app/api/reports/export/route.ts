import { NextResponse } from "next/server";
import { AuthorizationError, requireProviderApi } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { toMajorUnits } from "@/lib/money";
import { formatLocalTime, toLocalDate } from "@/lib/time";
import { statusLabelFr } from "@/lib/booking/state-machine";
import { resolvePeriod } from "@/lib/reports/period";
import { loadReport } from "@/lib/reports/service";

/**
 * GET /api/reports/export?periode=…&du=…&au=…
 *
 * The period's appointments as a CSV the provider can open in a spreadsheet,
 * scoped to her own data. A summary block sits on top so the file is readable
 * on its own, then one line per appointment for anyone who wants to pivot it.
 */

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  let provider;
  try {
    ({ provider } = await requireProviderApi("reports"));
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  const url = new URL(request.url);
  const period = resolvePeriod(
    {
      periode: url.searchParams.get("periode") ?? undefined,
      du: url.searchParams.get("du") ?? undefined,
      au: url.searchParams.get("au") ?? undefined,
    },
    provider.timezone,
  );

  const { metrics, appointments } = await loadReport(
    provider.id,
    period,
    provider.timezone,
  );

  // Amounts go out in whole currency units: a spreadsheet should not have to
  // know that FCFA has no subunit.
  const money = (minor: number) => toMajorUnits(minor, provider.currency);

  const lines: string[][] = [
    [`Rapport ${provider.businessName}`],
    ["Période", period.label],
    ["Du", period.from],
    ["Au", period.to],
    ["Devise", provider.currency],
    [],
    ["Chiffre d'affaires réalisé", String(money(metrics.revenue))],
    ["Chiffre d'affaires à venir", String(money(metrics.expectedRevenue))],
    ["Acomptes encaissés", String(money(metrics.depositsCollected))],
    ["Panier moyen", String(money(metrics.averageBasket))],
    ["Rendez-vous honorés", String(metrics.honoured)],
    ["Rendez-vous à venir", String(metrics.upcoming)],
    ["Annulations", String(metrics.cancelled)],
    ["Absences", String(metrics.noShow)],
    ["Réservations expirées", String(metrics.expired)],
    ["Acomptes refusés", String(metrics.rejected)],
    ["Clientes", String(metrics.customers)],
    ["Dont nouvelles", String(metrics.newCustomers)],
    ["Temps travaillé (minutes)", String(metrics.bookedMinutes)],
    [],
    ["Prestation", "Rendez-vous", "Chiffre d'affaires", "Part"],
    ...metrics.byService.map((row) => [
      row.label,
      String(row.count),
      String(money(row.revenue)),
      `${Math.round(row.share * 100)} %`,
    ]),
    [],
    [
      "Date",
      "Heure",
      "Cliente",
      "Téléphone",
      "Prestation",
      "Catégorie",
      "Statut",
      "Montant",
      "Acompte",
      "Acompte vérifié",
    ],
  ];

  // The detail rows need the customer's name and phone, which the metrics
  // deliberately do not carry.
  const details = await prisma.appointment.findMany({
    where: { id: { in: appointments.map((a) => a.id) } },
    select: { id: true, customerName: true, customerPhone: true },
  });
  const byId = new Map(details.map((row) => [row.id, row]));

  for (const appointment of appointments) {
    const detail = byId.get(appointment.id);
    lines.push([
      toLocalDate(appointment.startsAt, provider.timezone),
      formatLocalTime(appointment.startsAt, provider.timezone),
      detail?.customerName ?? "",
      detail?.customerPhone ?? "",
      appointment.serviceName,
      appointment.categoryName ?? "",
      statusLabelFr(appointment.status),
      String(money(appointment.totalAmount)),
      String(money(appointment.depositAmount)),
      appointment.depositVerified ? "oui" : "non",
    ]);
  }

  const filename = `rapport-${provider.slug}-${period.from}-${period.to}.csv`;

  return new NextResponse(toCsv(lines), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "private, no-store",
    },
  });
}

/**
 * Serialise to CSV.
 *
 * Separated by semicolons and prefixed with a byte-order mark, because that is
 * what Excel in a French locale opens correctly. A comma-separated file lands
 * in a single column and looks broken.
 */
function toCsv(rows: string[][]): string {
  const body = rows
    .map((row) => row.map(escapeCell).join(";"))
    .join("\r\n");
  return `﻿${body}\r\n`;
}

function escapeCell(value: string): string {
  // A leading =, +, - or @ would be read as a formula by a spreadsheet, so it
  // is neutralised before the value is quoted.
  const guarded = /^[=+\-@]/.test(value) ? `'${value}` : value;

  if (/[";\r\n]/.test(guarded)) {
    return `"${guarded.replace(/"/g, '""')}"`;
  }
  return guarded;
}
