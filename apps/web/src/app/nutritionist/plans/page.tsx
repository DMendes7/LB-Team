import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui";

export default function NutritionistPlansPage() {
  return (
    <AppShell role="NUTRITIONIST" title="Planos nutricionais">
      <Card>
        <p className="text-sm text-ink-800/80">
          Criar plano: <code className="rounded bg-brand-100 px-1">POST /nutritionist/templates</code> com refeições.
          Sobrescrever individual: <code className="rounded bg-brand-100 px-1">POST /nutritionist/patients/:id/override</code>.
        </p>
      </Card>
    </AppShell>
  );
}
