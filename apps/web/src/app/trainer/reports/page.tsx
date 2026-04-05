import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui";

export default function TrainerReportsPage() {
  return (
    <AppShell role="TRAINER" title="Relatórios">
      <Card>
        <p className="text-sm text-ink-800/80">
          Agregações de adesão e frequência podem ser expandidas com queries Prisma e export CSV. O dashboard já expõe
          listas de alunas em risco via <code className="rounded bg-brand-100 px-1">GET /trainer/dashboard</code>.
        </p>
      </Card>
    </AppShell>
  );
}
