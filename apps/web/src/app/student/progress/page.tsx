"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Card, ProgressBar } from "@/components/ui";

export default function ProgressPage() {
  const [d, setD] = useState<{
    level: { currentLevel: number; progressPercent: number; consistencyWeeks: number } | null;
    streak: { currentStreak: number; maxStreak: number; fireOn: boolean };
    weekly: { completed: number; target: number };
  } | null>(null);

  useEffect(() => {
    api("/student/dashboard").then(setD);
  }, []);

  return (
    <AppShell role="STUDENT" title="Progresso e níveis">
      {d && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <p className="text-xs font-semibold uppercase text-brand-800">Nível atual</p>
            <p className="font-display text-4xl font-bold text-ink-900">{d.level?.currentLevel ?? 1}</p>
            <p className="mt-2 text-sm text-ink-800/75">
              Semanas de meta batida alimentam o próximo nível — não só peso ou repetições.
            </p>
            <p className="mt-4 text-xs text-ink-800/60">Até o próximo nível</p>
            <ProgressBar value={d.level?.progressPercent ?? 0} max={100} />
          </Card>
          <Card>
            <p className="text-xs font-semibold uppercase text-brand-800">Streak</p>
            <p className="font-display text-4xl font-bold text-ink-900">{d.streak.currentStreak} dias</p>
            <p className="text-sm text-ink-800/70">Recorde: {d.streak.maxStreak}</p>
            <p className="mt-4 text-sm text-brand-800/90">
              {d.streak.fireOn ? "Seu fogo está aceso." : "Um check-in ou treino reacende com carinho."}
            </p>
          </Card>
          <Card className="md:col-span-2">
            <p className="font-semibold text-ink-900">Frequência desta semana</p>
            <p className="mt-2 text-2xl font-bold text-brand-800">
              {d.weekly.completed} / {d.weekly.target}
            </p>
            <div className="mt-4">
              <ProgressBar value={d.weekly.completed} max={d.weekly.target || 1} />
            </div>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
