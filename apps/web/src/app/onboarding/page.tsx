"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { notify } from "@/lib/notify";
import { Button, Card } from "@/components/ui";

export default function OnboardingPage() {
  const router = useRouter();
  const [goal, setGoal] = useState("HYPERTROPHY");
  const [fitnessLevel, setFitnessLevel] = useState("BEGINNER");
  const [weeklyTarget, setWeeklyTarget] = useState("THREE");
  const [limitationsNotes, setLimitationsNotes] = useState("");
  const [dailyTimeMinutes, setDailyTimeMinutes] = useState(45);
  const [locationHome, setLocationHome] = useState(true);
  const [locationGym, setLocationGym] = useState(false);
  const [equipmentNotes, setEquipmentNotes] = useState("Halteres, elástico");
  const [focusRegions, setFocusRegions] = useState("Glúteos, pernas");
  const [energyCycleNotes, setEnergyCycleNotes] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api("/onboarding", {
        method: "POST",
        body: JSON.stringify({
          goal,
          fitnessLevel,
          weeklyTarget,
          limitationsNotes: limitationsNotes || undefined,
          dailyTimeMinutes,
          locationHome,
          locationGym,
          equipmentNotes,
          focusRegions,
          energyCycleNotes: energyCycleNotes || undefined,
          limitations: limitationsNotes
            ? [{ category: "notas", description: limitationsNotes }]
            : undefined,
        }),
      });
      notify.success("Perfil salvo. Bem-vinda ao seu espaço!");
      router.push("/student/dashboard");
    } catch (e) {
      notify.apiError(e);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <Card>
        <h1 className="font-display text-2xl font-bold text-ink-900">Vamos conhecer você</h1>
        <p className="mt-1 text-sm text-ink-800/70">Isso ajuda a encaixar treino na sua vida real.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-brand-900">Objetivo</label>
            <select
              className="mt-1 w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            >
              <option value="WEIGHT_LOSS">Emagrecimento</option>
              <option value="HYPERTROPHY">Hipertrofia / definição</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-brand-900">Nível</label>
            <select
              className="mt-1 w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm"
              value={fitnessLevel}
              onChange={(e) => setFitnessLevel(e.target.value)}
            >
              <option value="BEGINNER">Iniciante</option>
              <option value="INTERMEDIATE">Intermediária</option>
              <option value="ADVANCED">Avançada</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-brand-900">Frequência semanal desejada</label>
            <select
              className="mt-1 w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm"
              value={weeklyTarget}
              onChange={(e) => setWeeklyTarget(e.target.value)}
            >
              <option value="TWO">2x</option>
              <option value="THREE">3x</option>
              <option value="FOUR">4x</option>
              <option value="FIVE">5x</option>
              <option value="SIX">6x</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-brand-900">Tempo médio por dia (min)</label>
            <input
              type="number"
              min={10}
              className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2 text-sm"
              value={dailyTimeMinutes}
              onChange={(e) => setDailyTimeMinutes(Number(e.target.value))}
            />
          </div>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={locationHome} onChange={(e) => setLocationHome(e.target.checked)} />
              Casa
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={locationGym} onChange={(e) => setLocationGym(e.target.checked)} />
              Academia
            </label>
          </div>
          <div>
            <label className="text-xs font-semibold text-brand-900">Equipamentos</label>
            <textarea
              className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2 text-sm"
              rows={2}
              value={equipmentNotes}
              onChange={(e) => setEquipmentNotes(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-brand-900">Regiões de foco</label>
            <input
              className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2 text-sm"
              value={focusRegions}
              onChange={(e) => setFocusRegions(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-brand-900">Limitações / dores / ciclo (opcional)</label>
            <textarea
              className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2 text-sm"
              rows={3}
              value={limitationsNotes}
              onChange={(e) => setLimitationsNotes(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-brand-900">Energia ao longo do mês (opcional)</label>
            <textarea
              className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2 text-sm"
              rows={2}
              value={energyCycleNotes}
              onChange={(e) => setEnergyCycleNotes(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full">
            Gerar meu plano inicial
          </Button>
        </form>
      </Card>
    </div>
  );
}
