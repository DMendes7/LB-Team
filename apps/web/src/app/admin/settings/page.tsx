import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui";

export default function AdminSettingsPage() {
  return (
    <AppShell role="ADMIN" title="Configurações">
      <Card>
        <p className="text-sm text-ink-800/80">
          <code className="rounded bg-brand-100 px-1">PATCH /admin/settings/streak_window_hours</code> com{" "}
          <code>{`{ "value": 24 }`}</code>
        </p>
        <p className="mt-4 text-sm text-ink-800/80">
          Mensagens de engajamento e regras de nível ficam nas tabelas EngagementMessage e LevelRule (seedadas).
        </p>
      </Card>
    </AppShell>
  );
}
