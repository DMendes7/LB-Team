"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { notify } from "@/lib/notify";
import { AppShell } from "@/components/AppShell";
import { Card, ProgressBar, StreakFireVisual } from "@/components/ui";

export default function ProgressPage() {
  const [d, setD] = useState<{
    level: { currentLevel: number; progressPercent: number; consistencyWeeks: number } | null;
    streak: { currentStreak: number; maxStreak: number; fireOn: boolean };
    weekly: { completed: number; target: number };
  } | null>(null);

  useEffect(() => {
    api("/student/dashboard")
      .then(setD)
      .catch((e) => notify.apiError(e));
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
          <Card className="border-brand-200/80 bg-gradient-to-br from-white to-brand-50/40">
            <div className="flex flex-wrap items-start gap-5">
              <StreakFireVisual
                on={d.streak.fireOn}
                iconClassName="h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase text-brand-800">Streak</p>
                <p className="font-display mt-1 text-4xl font-bold text-ink-900">
                  {d.streak.currentStreak}{" "}
                  {d.streak.currentStreak === 1 ? "dia" : "dias"}
                </p>
                <p className="mt-1 text-sm text-ink-800/70">
                  Recorde: {d.streak.maxStreak} {d.streak.maxStreak === 1 ? "dia" : "dias"}
                </p>
                <p className="mt-4 text-sm text-brand-800/90">
                  {d.streak.fireOn
                    ? "Seu fogo está aceso — sequência de dias com treino."
                    : "Registre um treino para reacender o fogo."}
                </p>
              </div>
            </div>
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
