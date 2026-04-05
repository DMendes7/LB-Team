import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui";

const supportive = [
  "Tudo bem recomeçar. Seu progresso continua.",
  "Um dia fora não define sua jornada.",
  "Voltar hoje já é uma vitória.",
  "Você não perdeu sua evolução, apenas sua sequência.",
  "Consistência vale mais que perfeição.",
];

export default function MessagesPage() {
  return (
    <AppShell role="STUDENT" title="Apoio">
      <p className="mb-4 text-sm text-ink-800/75">
        Mensagens acolhedoras quando o streak cai — sem punição dura. O app também escolhe textos automáticos pelo seu
        estado (risco de streak, meta quase fechada, etc.).
      </p>
      <div className="space-y-3">
        {supportive.map((t) => (
          <Card key={t}>
            <p className="text-ink-900">{t}</p>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
