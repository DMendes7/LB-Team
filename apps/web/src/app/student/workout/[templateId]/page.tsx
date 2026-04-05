"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ExerciseVideoPanel } from "@/components/ExerciseVideoPanel";
import { getPrescriptionBlocks } from "@/lib/prescription-blocks";
import { api } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Button, Card } from "@/components/ui";

type WorkoutRes = {
  template: { id: string; name: string; description: string | null } | null;
  day: {
    id: string;
    name: string;
    exercises: {
      orderIndex: number;
      sets: number;
      reps: string;
      restSec: number;
      cadence: string | null;
      prescriptionBlocks: unknown;
      notes: string | null;
      painAdjustHint: string | null;
      exercise: {
        id: string;
        name: string;
        videoUrl: string | null;
        videoFileKey: string | null;
        imageUrl: string | null;
        instructions: string | null;
        substitutionsFrom: { substitute: { id: string; name: string } }[];
      };
    }[];
  } | null;
  adaptationHint: string | null;
};

export default function StudentWorkoutSessionPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const [w, setW] = useState<WorkoutRes | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!templateId) return;
    setErr("");
    api<WorkoutRes>(`/student/workout-session?templateId=${encodeURIComponent(templateId)}`)
      .then(setW)
      .catch(() => {
        setW(null);
        setErr("Não foi possível carregar este treino.");
      });
  }, [templateId]);

  return (
    <AppShell role="STUDENT" title="Ficha">
      <Link href="/student/workout" className="mb-3 inline-block text-sm text-brand-700 hover:underline">
        ← Meus treinos
      </Link>

      {err && (
        <Card className="mb-3">
          <p className="text-sm text-red-700">{err}</p>
        </Card>
      )}

      {!w?.template && !err && (
        <Card>
          <p className="text-sm text-ink-800/80">Carregando…</p>
        </Card>
      )}

      {w?.template && (
        <>
          <Card className="mb-3 p-4">
            <h2 className="font-display text-lg font-bold text-ink-900">{w.template.name}</h2>
            {w.day?.name && <p className="mt-0.5 text-xs text-brand-700">{w.day.name}</p>}
            {w.template.description && (
              <p className="mt-1.5 text-xs leading-snug text-ink-800/75">{w.template.description}</p>
            )}
            {w.adaptationHint && (
              <p className="mt-2 text-xs leading-snug text-brand-800/90">{w.adaptationHint}</p>
            )}
            <Link href={`/student/workout/run/${templateId}`} className="mt-3 inline-block">
              <Button>Iniciar execução</Button>
            </Link>
          </Card>
          {w.day?.exercises.map((row) => {
            const blocks = getPrescriptionBlocks(row);
            const hasVideo = row.exercise.videoFileKey || row.exercise.videoUrl;
            return (
              <Card
                key={row.orderIndex}
                className="mb-2 overflow-hidden rounded-xl border border-brand-100/70 p-3 sm:p-3.5"
              >
                <div className={`flex min-w-0 gap-3 ${hasVideo ? "flex-row items-start" : "flex-col"}`}>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-bold leading-tight text-ink-900">{row.exercise.name}</h3>
                    {row.cadence?.trim() && (
                      <p className="mt-1 text-[11px] leading-snug text-ink-800 sm:text-xs">
                        <span className="font-semibold text-ink-900">Cadência:</span>{" "}
                        <span className="uppercase tracking-wide text-ink-800/85">{row.cadence.trim()}</span>
                      </p>
                    )}
                    <div className="mt-2 space-y-2">
                      {blocks.map((b, i) => (
                        <div
                          key={i}
                          className="rounded-r-md border-l-2 border-orange-400 bg-orange-50/90 py-1.5 pl-2.5 pr-1.5 text-[11px] leading-snug text-ink-800 sm:pl-3 sm:text-xs"
                        >
                          {b.instructions?.trim() && (
                            <div className="space-y-0.5">
                              {b.instructions.split(/\n+/).map((line, j) => (
                                <p key={j}>
                                  <span className="font-semibold text-orange-900/90">Instruções:</span> {line}
                                </p>
                              ))}
                            </div>
                          )}
                          <p className="mt-1 font-semibold text-ink-900">
                            <span className="text-orange-700">Séries</span> · {b.sets} / {b.reps}
                          </p>
                          <p className="mt-0.5">
                            <span className="font-semibold text-ink-800">Carga:</span>{" "}
                            {b.weightKg != null && !Number.isNaN(b.weightKg) ? `${b.weightKg}` : "0"} kg
                          </p>
                          <p className="mt-0.5 font-medium text-orange-600">⏱ Intervalo: {b.restSec}s</p>
                        </div>
                      ))}
                    </div>
                    {row.painAdjustHint && (
                      <p className="mt-2 text-[10px] text-orange-800/90 sm:text-xs">{row.painAdjustHint}</p>
                    )}
                    {row.exercise.substitutionsFrom.length > 0 && (
                      <p className="mt-1.5 text-[10px] text-ink-800/65 sm:text-xs">
                        Substituições: {row.exercise.substitutionsFrom.map((s) => s.substitute.name).join(", ")}
                      </p>
                    )}
                  </div>
                  {hasVideo && (
                    <div className="flex w-[78px] shrink-0 flex-col items-center sm:w-[86px]">
                      <ExerciseVideoPanel
                        compact
                        title={row.exercise.name}
                        videoUrl={row.exercise.videoUrl}
                        videoFileKey={row.exercise.videoFileKey}
                        posterUrl={row.exercise.imageUrl}
                      />
                      <p className="mt-1 max-w-[5.5rem] text-center text-[9px] leading-tight text-ink-800/50 sm:text-[10px]">
                        Toque no vídeo para tela cheia
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </>
      )}
    </AppShell>
  );
}
