"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ExerciseVideoPanel } from "@/components/ExerciseVideoPanel";
import { getPrescriptionBlocks } from "@/lib/prescription-blocks";
import { parseWeightsInput, totalSetsForRow } from "@/lib/workout-weights";
import { api } from "@/lib/api";
import { notify } from "@/lib/notify";
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
};

type RowState = Row & {
  /** Concluído com registro; “não fiz” / sem marcar vão como não concluído ao encerrar. */
  status: "pending" | "done" | "skipped" | "not_done";
  /** Texto livre: um kg para todas as séries ou lista separada por vírgula. */
  weightsInput: string;
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

function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function WorkoutRunWithTemplatePage() {
  const router = useRouter();
  const { templateId } = useParams<{ templateId: string }>();
  const [rows, setRows] = useState<RowState[]>([]);
  const [dayIndex, setDayIndex] = useState<number | null>(null);
  const [err, setErr] = useState("");
  const [completionId, setCompletionId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [startErr, setStartErr] = useState("");
  const [tick, setTick] = useState(0);

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
          notify.warning("Treino não encontrado.");
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
            status: "pending" as const,
            weightsInput: "",
          })),
        );
      })
      .catch((e) => {
        notify.apiError(e);
        setErr("Sem acesso a este treino.");
      });
  }, [templateId]);

  useEffect(() => {
    if (!templateId || rows.length === 0) return;
    let cancelled = false;
    setStartErr("");
    api<{ id: string; startedAt: string }>("/student/workout-session/start", {
      method: "POST",
      body: JSON.stringify({ templateId, dayIndex: dayIndex ?? undefined }),
    })
      .then((s) => {
        if (!cancelled) {
          setCompletionId(s.id);
          setStartedAt(s.startedAt);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          notify.apiError(e);
          setStartErr("Não foi possível iniciar o registro do treino. Tente sair e entrar de novo.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [templateId, rows.length, dayIndex]);

  useEffect(() => {
    if (!startedAt) return;
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [startedAt]);

  const elapsedSec = useMemo(() => {
    if (!startedAt) return 0;
    void tick;
    return Math.max(0, Math.floor((Date.now() - Date.parse(startedAt)) / 1000));
  }, [startedAt, tick]);

  function setRowStatus(i: number, status: RowState["status"]) {
    setRows((prev) => {
      const copy = [...prev];
      const cur = copy[i];
      if (!cur) return prev;
      copy[i] = { ...cur, status };
      return copy;
    });
  }

  function setRowWeightsInput(i: number, weightsInput: string) {
    setRows((prev) => {
      const copy = [...prev];
      const cur = copy[i];
      if (!cur) return prev;
      copy[i] = { ...cur, weightsInput };
      return copy;
    });
  }

  function openFinish() {
    setFinishErr("");
    setIntensity("MODERATE");
    setDisposition("NORMAL");
    setFinishNote("");
    setFinishOpen(true);
  }

  async function submitFinish() {
    if (!templateId || !completionId) return;
    setSaving(true);
    setFinishErr("");
    try {
      const exercises = rows.map((r) => {
        const total = totalSetsForRow(r);
        const series = parseWeightsInput(r.weightsInput, total);
        return {
          exerciseId: r.exercise.id,
          orderIndex: r.orderIndex,
          skipped: r.status === "skipped",
          done: r.status === "done",
          weightsSeries: series ?? null,
          weightKg: series?.[0] ?? null,
        };
      });
      await api(`/student/workout-session/${completionId}/finish`, {
        method: "POST",
        body: JSON.stringify({
          dayFeeling: intensity,
          notes: finishNote.trim() || undefined,
          disposition,
          exercises,
        }),
      });
      notify.success("Treino registrado com sucesso.");
      router.push("/student/history");
    } catch (e) {
      notify.apiError(e);
      setFinishErr(e instanceof Error ? e.message : "Não foi possível encerrar.");
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
    <AppShell role="STUDENT" title="Treino">
      <Link href={`/student/workout/${templateId}`} className="mb-3 inline-block text-sm text-brand-700 hover:underline">
        ← Ver ficha completa
      </Link>

      {startErr && (
        <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">{startErr}</p>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-ink-800/80">Carregando exercícios…</p>
      ) : (
        <>
          <Card className="sticky top-14 z-20 mb-4 border-brand-200 bg-white/95 py-3 shadow-md backdrop-blur-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-800">Tempo no treino</p>
                <p className="font-display text-2xl font-bold tabular-nums text-ink-900">{formatDuration(elapsedSec)}</p>
                {!completionId && <p className="text-xs text-ink-800/60">Sincronizando registro…</p>}
              </div>
              <Button type="button" className="shrink-0" onClick={openFinish} disabled={!completionId}>
                Encerrar treino
              </Button>
            </div>
            <p className="mt-2 text-xs text-ink-800/65">
              Você pode encerrar a qualquer momento. Cargas podem ser anotadas a qualquer momento, sem precisar marcar
              “Fiz”. Exercícios sem “Fiz” ou com “Não fiz” ficam como não concluídos no relatório.
            </p>
          </Card>

          <ul className="space-y-4 pb-8">
            {rows.map((row, i) => {
              const blocks = getPrescriptionBlocks(row);
              const totalSets = totalSetsForRow(row);
              const hasVideo = row.exercise.videoFileKey || row.exercise.videoUrl;
              return (
                <li key={row.orderIndex}>
                  <Card className="overflow-hidden border-brand-100/80 p-3 sm:p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-[11px] font-medium text-brand-800">
                        Exercício {i + 1} / {rows.length}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        <Button
                          type="button"
                          variant={row.status === "done" ? "primary" : "outline"}
                          className="min-h-0 px-2 py-1 text-xs"
                          onClick={() => setRowStatus(i, "done")}
                        >
                          Fiz
                        </Button>
                        <Button
                          type="button"
                          variant={row.status === "not_done" ? "primary" : "outline"}
                          className="min-h-0 px-2 py-1 text-xs"
                          onClick={() => setRowStatus(i, "not_done")}
                        >
                          Não fiz
                        </Button>
                        <Button
                          type="button"
                          variant={row.status === "skipped" ? "primary" : "outline"}
                          className="min-h-0 px-2 py-1 text-xs"
                          onClick={() => setRowStatus(i, "skipped")}
                        >
                          Pulei
                        </Button>
                      </div>
                    </div>
                    <div className={`mt-2 flex min-w-0 gap-3 ${hasVideo ? "flex-row items-start" : "flex-col"}`}>
                      <div className="min-w-0 flex-1">
                        <h2 className="text-lg font-bold leading-tight text-ink-900">{row.exercise.name}</h2>
                        {row.cadence?.trim() && (
                          <p className="mt-1 text-[11px] text-ink-800 sm:text-xs">
                            <span className="font-semibold">Cadência:</span>{" "}
                            <span className="uppercase">{row.cadence.trim()}</span>
                          </p>
                        )}
                        <div className="mt-2 space-y-2">
                          {blocks.map((b, bi) => (
                            <div
                              key={bi}
                              className="rounded-r-md border-l-2 border-orange-400 bg-orange-50/90 py-1.5 pl-2.5 pr-1.5 text-[11px] leading-snug sm:text-xs"
                            >
                              {b.instructions?.trim() && (
                                <p className="whitespace-pre-line text-ink-800/90">{b.instructions}</p>
                              )}
                              <p className="mt-1 font-semibold text-ink-900">
                                {b.sets} séries · {b.reps} reps · {b.restSec}s
                                {b.weightKg != null && !Number.isNaN(b.weightKg) ? ` · plano ${b.weightKg} kg` : ""}
                              </p>
                            </div>
                          ))}
                        </div>
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
                        </div>
                      )}
                    </div>
                    <label className="mt-3 block text-sm">
                      <span className="text-ink-800/80">Cargas que usei (kg) — opcional</span>
                      <p className="mt-1 text-[11px] leading-snug text-ink-800/60">
                        <strong>{totalSets}</strong> série(s) neste exercício. Um valor = mesma carga em todas. Vários
                        separados por vírgula = 1.ª, 2.ª, 3.ª… (ex.:{" "}
                        <span className="font-mono text-ink-800">10, 15, 20</span>)
                      </p>
                      <input
                        type="text"
                        inputMode="decimal"
                        className="mt-2 w-full max-w-md rounded-xl border border-brand-200 px-3 py-2 text-sm"
                        placeholder="Ex.: 20 ou 10, 12,5, 15"
                        autoComplete="off"
                        value={row.weightsInput}
                        onChange={(e) => setRowWeightsInput(i, e.target.value)}
                      />
                    </label>
                  </Card>
                </li>
              );
            })}
          </ul>

          <div className="pb-10">
            <Button type="button" className="w-full" onClick={openFinish} disabled={!completionId}>
              Encerrar e registrar treino
            </Button>
          </div>
        </>
      )}

      {finishOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-3 sm:items-center">
          <Card className="max-h-[min(90vh,640px)] w-full max-w-lg overflow-y-auto rounded-2xl p-4 shadow-xl">
            <p className="font-display text-lg font-bold text-ink-900">Registrar treino</p>
            <p className="mt-1 text-sm text-ink-800/75">
              Tempo contado: <strong>{formatDuration(elapsedSec)}</strong>. Sua personal verá o que foi feito, pesos e o
              que ficou pendente.
            </p>

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
              placeholder="Recado para a personal (opcional)"
              value={finishNote}
              onChange={(e) => setFinishNote(e.target.value)}
            />

            {finishErr && <p className="mt-3 text-sm text-red-700">{finishErr}</p>}

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" disabled={saving} onClick={() => setFinishOpen(false)}>
                Voltar
              </Button>
              <Button type="button" disabled={saving} onClick={() => void submitFinish()}>
                {saving ? "Salvando…" : "Confirmar registro"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
