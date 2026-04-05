"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ExerciseVideoPanel } from "@/components/ExerciseVideoPanel";
import { getPrescriptionBlocks } from "@/lib/prescription-blocks";
import { api } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Button, Card } from "@/components/ui";

type ExerciseFull = {
  id: string;
  name: string;
  videoUrl: string | null;
  videoFileKey: string | null;
  imageUrl: string | null;
  instructions: string | null;
};

type Row = {
  orderIndex: number;
  sets: number;
  reps: string;
  restSec: number;
  cadence: string | null;
  prescriptionBlocks: unknown;
  notes: string | null;
  exercise: ExerciseFull;
  skipped?: boolean;
  substitutedId?: string | null;
};

const intensities = [
  { v: "LIGHT", label: "Tranquilo" },
  { v: "MODERATE", label: "Moderado" },
  { v: "HARD", label: "Intenso" },
  { v: "VERY_HARD", label: "No limite" },
] as const;

const dispositions = [
  { v: "TIRED", label: "Cansada" },
  { v: "NORMAL", label: "Normal" },
  { v: "ENERGETIC", label: "Disposta" },
  { v: "IN_PAIN", label: "Com dor" },
  { v: "NO_TIME", label: "Sem tempo" },
] as const;

export default function WorkoutRunWithTemplatePage() {
  const router = useRouter();
  const { templateId } = useParams<{ templateId: string }>();
  const [idx, setIdx] = useState(0);
  const [rows, setRows] = useState<Row[]>([]);
  const [dayIndex, setDayIndex] = useState<number | null>(null);
  const [err, setErr] = useState("");
  const [finishOpen, setFinishOpen] = useState(false);
  const [intensity, setIntensity] = useState<string>("MODERATE");
  const [disposition, setDisposition] = useState<string>("NORMAL");
  const [finishNote, setFinishNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [finishErr, setFinishErr] = useState("");

  useEffect(() => {
    if (!templateId) return;
    setErr("");
    api<{
      template: { id: string } | null;
      day: {
        dayIndex: number;
        exercises: {
          orderIndex: number;
          sets: number;
          reps: string;
          restSec: number;
          cadence: string | null;
          prescriptionBlocks: unknown;
          notes: string | null;
          exercise: ExerciseFull;
        }[];
      } | null;
    }>(`/student/workout-session?templateId=${encodeURIComponent(templateId)}`)
      .then((r) => {
        if (!r.template) {
          setErr("Treino não encontrado.");
          return;
        }
        setDayIndex(r.day?.dayIndex ?? null);
        setRows(
          (r.day?.exercises ?? []).map((e) => ({
            orderIndex: e.orderIndex,
            sets: e.sets,
            reps: e.reps,
            restSec: e.restSec,
            cadence: e.cadence,
            prescriptionBlocks: e.prescriptionBlocks,
            notes: e.notes,
            exercise: e.exercise,
            skipped: false,
          })),
        );
      })
      .catch(() => setErr("Sem acesso a este treino."));
  }, [templateId]);

  const cur = rows[idx];
  const blocks = cur ? getPrescriptionBlocks(cur) : [];
  const hasVideo = cur?.exercise.videoFileKey || cur?.exercise.videoUrl;

  function openFinish() {
    setFinishErr("");
    setIntensity("MODERATE");
    setDisposition("NORMAL");
    setFinishNote("");
    setFinishOpen(true);
  }

  async function submitFinish() {
    if (!templateId) return;
    setSaving(true);
    setFinishErr("");
    try {
      const res = await api<{ error?: string }>("/student/workout-complete", {
        method: "POST",
        body: JSON.stringify({
          templateId,
          dayIndex,
          dayFeeling: intensity,
          notes: finishNote.trim() || undefined,
          disposition,
          exercises: rows.map((r) => ({
            exerciseId: r.exercise.id,
            orderIndex: r.orderIndex,
            skipped: r.skipped,
            substitutedId: r.substitutedId,
          })),
        }),
      });
      if (res && typeof res === "object" && "error" in res && res.error) {
        setFinishErr(res.error);
        return;
      }
      router.push("/student/dashboard");
    } catch (e) {
      setFinishErr(e instanceof Error ? e.message : "Não foi possível concluir.");
    } finally {
      setSaving(false);
    }
  }

  if (err) {
    return (
      <AppShell role="STUDENT" title="Executando">
        <Card>
          <p className="text-sm text-red-700">{err}</p>
          <Link href="/student/workout" className="mt-3 inline-block text-sm text-brand-700 hover:underline">
            Voltar aos treinos
          </Link>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell role="STUDENT" title="Executando">
      {!cur ? (
        <p className="text-sm text-ink-800/80">Carregando exercícios…</p>
      ) : (
        <Card className="rounded-xl p-3 sm:p-4">
          <p className="text-[11px] font-medium text-brand-800">
            Exercício {idx + 1} / {rows.length}
          </p>
          <div className={`mt-2 flex min-w-0 gap-3 ${hasVideo ? "flex-row items-start" : "flex-col"}`}>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold leading-tight text-ink-900">{cur.exercise.name}</h2>
              {cur.cadence?.trim() && (
                <p className="mt-1 text-[11px] text-ink-800 sm:text-xs">
                  <span className="font-semibold">Cadência:</span>{" "}
                  <span className="uppercase">{cur.cadence.trim()}</span>
                </p>
              )}
              <div className="mt-2 space-y-2">
                {blocks.map((b, i) => (
                  <div
                    key={i}
                    className="rounded-r-md border-l-2 border-orange-400 bg-orange-50/90 py-1.5 pl-2.5 pr-1.5 text-[11px] leading-snug sm:text-xs"
                  >
                    {b.instructions?.trim() && (
                      <p className="whitespace-pre-line text-ink-800/90">{b.instructions}</p>
                    )}
                    <p className="mt-1 font-semibold text-ink-900">
                      {b.sets} séries · {b.reps} reps · {b.restSec}s
                      {b.weightKg != null && !Number.isNaN(b.weightKg) ? ` · ${b.weightKg} kg` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            {hasVideo && (
              <div className="flex w-[78px] shrink-0 flex-col items-center sm:w-[86px]">
                <ExerciseVideoPanel
                  compact
                  title={cur.exercise.name}
                  videoUrl={cur.exercise.videoUrl}
                  videoFileKey={cur.exercise.videoFileKey}
                  posterUrl={cur.exercise.imageUrl}
                />
                <p className="mt-1 max-w-[5.5rem] text-center text-[9px] text-ink-800/50 sm:text-[10px]">
                  Toque para tela cheia
                </p>
              </div>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" className="text-sm" onClick={() => setIdx((i) => Math.min(i + 1, rows.length - 1))}>
              Concluí este
            </Button>
            <Button
              type="button"
              variant="outline"
              className="text-sm"
              onClick={() => {
                const copy = [...rows];
                copy[idx] = { ...copy[idx], skipped: true };
                setRows(copy);
                setIdx((i) => Math.min(i + 1, rows.length - 1));
              }}
            >
              Pular
            </Button>
          </div>
          {idx >= rows.length - 1 && (
            <Button className="mt-5 w-full" type="button" onClick={openFinish}>
              Concluir treino
            </Button>
          )}
        </Card>
      )}

      {finishOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-3 sm:items-center">
          <Card className="max-h-[min(90vh,640px)] w-full max-w-lg overflow-y-auto rounded-2xl p-4 shadow-xl">
            <p className="font-display text-lg font-bold text-ink-900">Como foi o treino?</p>
            <p className="mt-1 text-sm text-ink-800/75">Ajuda sua personal a ajustar a carga e o volume com segurança.</p>

            <p className="mt-5 text-xs font-semibold uppercase text-brand-800">Nível de esforço</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {intensities.map((it) => (
                <button
                  key={it.v}
                  type="button"
                  onClick={() => setIntensity(it.v)}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                    intensity === it.v
                      ? "border-brand-500 bg-brand-50 text-brand-900"
                      : "border-brand-200 text-ink-800"
                  }`}
                >
                  {it.label}
                </button>
              ))}
            </div>

            <p className="mt-5 text-xs font-semibold uppercase text-brand-800">Como você estava hoje</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {dispositions.map((d) => (
                <button
                  key={d.v}
                  type="button"
                  onClick={() => setDisposition(d.v)}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                    disposition === d.v
                      ? "border-brand-500 bg-brand-50 text-brand-900"
                      : "border-brand-200 text-ink-800"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <textarea
              className="mt-4 w-full rounded-xl border border-brand-200 p-3 text-sm"
              rows={3}
              placeholder="Quer deixar algum recado? (opcional)"
              value={finishNote}
              onChange={(e) => setFinishNote(e.target.value)}
            />

            {finishErr && <p className="mt-3 text-sm text-red-700">{finishErr}</p>}

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" disabled={saving} onClick={() => setFinishOpen(false)}>
                Voltar ao treino
              </Button>
              <Button type="button" disabled={saving} onClick={() => void submitFinish()}>
                {saving ? "Salvando…" : "Finalizar"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
