import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui";

export default function NutritionistGroupsPage() {
  return (
    <AppShell role="NUTRITIONIST" title="Grupos nutricionais">
      <Card>
        <p className="text-sm text-ink-800/80">
          <code className="rounded bg-brand-100 px-1">POST /nutritionist/groups</code> e{" "}
          <code className="rounded bg-brand-100 px-1">POST /nutritionist/groups/:id/members</code> para associar
          pacientes ao plano base.
        </p>
      </Card>
    </AppShell>
  );
}
