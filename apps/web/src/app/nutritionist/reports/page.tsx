import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui";

export default function NutritionistReportsPage() {
  return (
    <AppShell role="NUTRITIONIST" title="Relatórios">
      <Card>
        <p className="text-sm text-ink-800/80">Expanda com logs em NutritionLog e taxa de abertura da área nutricional.</p>
      </Card>
    </AppShell>
  );
}
