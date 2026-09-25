import { requirePlatformAdminPage } from "@/lib/auth/guard";
import { PageHeader } from "@/components/dashboard/ui";
import { CreateProviderForm } from "@/components/admin/CreateProviderForm";
import { listActivities } from "@/lib/platform/activities";

export const dynamic = "force-dynamic";

export default async function NewProviderPage() {
  await requirePlatformAdminPage();

  return (
    <>
      <PageHeader
        title="Créer une activité"
        description="Choisissez son métier : la palette, les textes d'accueil et un catalogue de départ sont posés en conséquence. Elle modifie tout depuis son espace."
      />
      <CreateProviderForm activities={listActivities()} />
    </>
  );
}
