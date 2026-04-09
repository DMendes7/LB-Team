"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { notify } from "@/lib/notify";
import { AppShell } from "@/components/AppShell";
import { Button, Card } from "@/components/ui";

export default function StudentNutritionPage() {
  const [data, setData] = useState<{
    template: {
      title: string;
      summary: string | null;
      guidelines: string | null;
      practicalTips: string | null;
      meals: { name: string; description: string | null; substitutions: string | null }[];
    } | null;
    fromOverride?: boolean;
  } | null>(null);

  useEffect(() => {
    api("/student/nutrition-plan")
      .then(setData)
      .catch((e) => {
        notify.apiError(e);
        setData({ template: null });
      });
    api("/student/nutrition/open", { method: "POST", body: "{}" }).catch(() => {});
  }, []);

  return (
    <AppShell role="STUDENT" title="Nutrição">
      {!data?.template && <Card>Sem plano nutricional vinculado ainda.</Card>}
      {data?.template && (
        <>
          <Card className="mb-4">
            <p className="text-xs uppercase tracking-wide text-brand-800">
              {data.fromOverride ? "Plano individual" : "Plano do grupo (pode ser ajustado para você)"}
            </p>
            <h2 className="font-display mt-2 text-2xl font-bold">{data.template.title}</h2>
            {data.template.summary && <p className="mt-3 text-ink-800/80">{data.template.summary}</p>}
          </Card>
          {data.template.guidelines && (
            <Card className="mb-4">
              <h3 className="font-semibold text-ink-900">Orientações</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm text-ink-800/85">{data.template.guidelines}</p>
            </Card>
          )}
          {data.template.practicalTips && (
            <Card className="mb-4">
              <h3 className="font-semibold text-ink-900">Na rotina real</h3>
              <p className="mt-2 text-sm text-ink-800/85">{data.template.practicalTips}</p>
            </Card>
          )}
          <h3 className="mb-2 font-display text-lg font-semibold">Refeições sugeridas</h3>
          {data.template.meals.map((m) => (
            <Card key={m.name} className="mb-3">
              <p className="font-medium text-ink-900">{m.name}</p>
              {m.description && <p className="mt-1 text-sm text-ink-800/80">{m.description}</p>}
              {m.substitutions && (
                <p className="mt-2 text-xs text-brand-800/90">Substituições: {m.substitutions}</p>
              )}
            </Card>
          ))}
          <Button variant="outline" type="button" className="mt-4" onClick={() => window.history.back()}>
            Voltar
          </Button>
        </>
      )}
    </AppShell>
  );
}
