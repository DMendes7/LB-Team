"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Button, Card, ProgressBar, StreakFire } from "@/components/ui";

type Dashboard = {
  greeting: string;
  weekly: { completed: number; target: number };
  level: { currentLevel: number; progressPercent: number; consistencyWeeks: number } | null;
  streak: { currentStreak: number; maxStreak: number; fireOn: boolean; windowHours: number };
  engagement: { text: string; tone: string };
  hasWorkoutPlan: boolean;
  profile: { onboardingCompleted?: boolean } | null;
};

export default function StudentDashboardPage() {
  const [d, setD] = useState<Dashboard | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api<Dashboard>("/student/dashboard")
      .then(setD)
      .catch(() => setErr("Faça login como aluna."));
  }, []);

  if (err || !d) {
    return (
      <div className="p-8 text-center">
        <p className="text-ink-800">{err || "Carregando…"}</p>
        <Link href="/login" className="mt-4 inline-block text-brand-700">
          Login
        </Link>
      </div>
    );
  }

  return (
    <AppShell role="STUDENT" title="Seu espaço">
      <p className="mb-6 text-ink-800/80 animate-fade-in">{d.greeting}</p>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <StreakFire on={d.streak.fireOn} days={d.streak.currentStreak} />
          <p className="mt-3 text-xs text-ink-800/60">
            Janela de {d.streak.windowHours}h para manter o fogo. Constância &gt; perfeição.
          </p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-800">Nível (por constância)</p>
          <p className="font-display mt-1 text-3xl font-bold text-ink-900">Nível {d.level?.currentLevel ?? 1}</p>
          <p className="mt-2 text-sm text-ink-800/70">Próximo nível</p>
          <ProgressBar value={d.level?.progressPercent ?? 0} max={100} />
        </Card>
        <Card className="md:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase text-brand-800">Meta semanal</p>
              <p className="font-display text-2xl font-bold text-ink-900">
                {d.weekly.completed} / {d.weekly.target} treinos
              </p>
            </div>
            <Link href="/student/workout">
              <Button>{d.hasWorkoutPlan ? "Meus treinos" : "Aguardando plano da personal"}</Button>
            </Link>
          </div>
          <div className="mt-4">
            <ProgressBar value={Math.min(d.weekly.completed, d.weekly.target)} max={d.weekly.target || 1} />
          </div>
        </Card>
        <Card className="border-l-4 border-brand-400 md:col-span-2">
          <p className="text-sm font-medium text-brand-900">Mensagem do dia</p>
          <p className="mt-2 text-ink-800/85">{d.engagement.text}</p>
        </Card>
        <Card>
          <p className="font-medium text-ink-900">Nutrição</p>
          <p className="mt-1 text-sm text-ink-800/70">Diretrizes flexíveis da sua nutri.</p>
          <Link href="/student/nutrition" className="mt-4 inline-block">
            <Button variant="outline">Abrir área nutricional</Button>
          </Link>
        </Card>
      </div>
    </AppShell>
  );
}
