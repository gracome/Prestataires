import { requireSection } from "@/lib/auth/guard";
import { PageHeader } from "@/components/dashboard/ui";
import {
  ReportSection,
  type ReportQuery,
} from "@/components/dashboard/ReportSection";

/**
 * The detailed report.
 *
 * The dashboard already answers "how am I doing" at a glance. This is where a
 * provider comes to pick an exact range, read the full rankings and take the
 * figures away as a spreadsheet.
 */

export const dynamic = "force-dynamic";

export default async function RapportsPage({
  searchParams,
}: {
  searchParams: Promise<ReportQuery>;
}) {
  const { provider } = await requireSection("reports");
  const query = await searchParams;

  return (
    <>
      <PageHeader
        title="Rapports"
        description="Choisissez une période, comparez-la à la précédente, et exportez le détail."
      />

      <ReportSection
        providerId={provider.id}
        timezone={provider.timezone}
        query={query}
        basePath="/dashboard/rapports"
      />
    </>
  );
}
