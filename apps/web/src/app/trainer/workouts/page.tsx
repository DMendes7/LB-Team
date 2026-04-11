"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { api } from "@/lib/api";
import { notify } from "@/lib/notify";
import { AppShell } from "@/components/AppShell";
import { Button, Card } from "@/components/ui";

type ExerciseRef = { id: string; name: string; muscleGroup: string };

type BlockDraft = {
  instructions: string;
  sets: number;
  reps: string;
  weightKg: number;
  restSec: number;
};

type ExerciseDraft = {
  exerciseId: string;
  orderIndex: number;
  sets: number;
  reps: string;
  restSec: number;
  cadence: string;
  notes: string;
  blocks: BlockDraft[];
};

type TemplateExercise = {
  orderIndex: number;
  sets: number;
  reps: string;
  restSec: number;
  cadence?: string | null;
  prescriptionBlocks?: unknown;
  notes?: string | null;
  exerciseId: string;
  exercise?: ExerciseRef;
};

type TemplateFull = {
  id: string;
  name: string;
  description: string | null;
  privateForStudentId?: string | null;
  days: {
    dayIndex: number;
    name: string;
    exercises: TemplateExercise[];
  }[];
};

function parseBlocksFromApi(e: TemplateExercise): BlockDraft[] {
  const raw = e.prescriptionBlocks;
  if (Array.isArray(raw) && raw.length > 0) {
    const out: BlockDraft[] = [];
    for (const item of raw) {
      if (typeof item !== "object" || item === null) continue;
      const o = item as Record<string, unknown>;
      const sets = Number(o.sets);
      const restSec = Number(o.restSec);
      if (!Number.isFinite(sets) || !Number.isFinite(restSec)) continue;
      out.push({
        instructions: typeof o.instructions === "string" ? o.instructions : "",
        sets,
        reps: typeof o.reps === "string" ? o.reps : String(o.reps ?? "12"),
        weightKg: o.weightKg == null || o.weightKg === "" ? 0 : Number(o.weightKg) || 0,
        restSec,
      });
    }
    if (out.length) return out;
  }
  return [
    {
      instructions: e.notes ?? "",
      sets: e.sets,
      reps: e.reps,
      weightKg: 0,
      restSec: e.restSec,
    },
  ];
}

function exerciseDraftFromTemplate(e: TemplateExercise): ExerciseDraft {
  const blocks = parseBlocksFromApi(e);
  const first = blocks[0];
  return {
    exerciseId: e.exerciseId,
    orderIndex: e.orderIndex,
    sets: first?.sets ?? e.sets,
    reps: first?.reps ?? e.reps,
    restSec: first?.restSec ?? e.restSec,
    cadence: e.cadence ?? "",
    notes: e.notes ?? "",
    blocks: blocks.length ? blocks : [{ instructions: "", sets: 3, reps: "12", weightKg: 0, restSec: 60 }],
  };
}

/** Modelos antigos com vários dias viram uma lista única (ordem dos dias preservada). */
function templateToExercises(t: TemplateFull): ExerciseDraft[] {
  const sortedDays = (t.days ?? []).slice().sort((a, b) => a.dayIndex - b.dayIndex);
  const out: ExerciseDraft[] = [];
  for (const d of sortedDays) {
    const exs = (d.exercises ?? []).slice().sort((a, b) => a.orderIndex - b.orderIndex);
    for (const e of exs) {
      out.push(exerciseDraftFromTemplate(e));
    }
  }
  return out;
}

function normalizeBlocksForSave(blocks: BlockDraft[]): BlockDraft[] {
  if (blocks.length > 0) return blocks;
  return [{ instructions: "", sets: 3, reps: "12", weightKg: 0, restSec: 60 }];
}

export default function TrainerWorkoutsPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-ink-800/75">Carregando modelos…</p>}>
      <TrainerWorkoutsPageInner />
    </Suspense>
  );
}

function TrainerWorkoutsPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fromStudentId = searchParams.get("fromStudent");
  const [catalog, setCatalog] = useState<ExerciseRef[]>([]);
  const [templates, setTemplates] = useState<TemplateFull[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [exercises, setExercises] = useState<ExerciseDraft[]>([]);
  const [confirmDeleteTemplate, setConfirmDeleteTemplate] = useState(false);
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateDescription, setNewTemplateDescription] = useState("");
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");

  const loadTemplates = useCallback((): Promise<void> => {
    return api<TemplateFull[]>("/trainer/workout-templates")
      .then((rows) => {
        setTemplates(rows);
        setLibraryLoaded(true);
      })
      .catch((e) => {
        notify.apiError(e);
        setTemplates([]);
        setLibraryLoaded(true);
      });
  }, []);

  useEffect(() => {
    api<ExerciseRef[]>("/trainer/exercises")
      .then(setCatalog)
      .catch((e) => notify.apiError(e));
    loadTemplates();
  }, [loadTemplates]);

  const selectTemplate = useCallback((t: TemplateFull) => {
    setSelectedId(t.id);
    setName(t.name);
    setDescription(t.description ?? "");
    setExercises(templateToExercises(t));
  }, []);

  const tParam = searchParams.get("t");
  const prevTParamForClearRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const hadT = prevTParamForClearRef.current;
    prevTParamForClearRef.current = tParam;
    if (hadT && !tParam) {
      setSelectedId(null);
      setExercises([]);
      setName("");
      setDescription("");
    }
  }, [tParam]);

  useEffect(() => {
    if (!tParam || !libraryLoaded) return;
    const found = templates.find((x) => x.id === tParam);
    if (found) {
      selectTemplate(found);
      return;
    }
    let cancelled = false;
    api<TemplateFull>(`/trainer/workout-templates/${tParam}`)
      .then((t) => {
        if (!cancelled) selectTemplate(t);
      })
      .catch((e) => {
        if (!cancelled) {
          notify.apiError(e);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [tParam, libraryLoaded, templates, selectTemplate]);

  useEffect(() => {
    if (searchParams.get("treinoSalvo") !== "1") return;
    notify.success("Treino salvo com sucesso.");
    router.replace(pathname);
  }, [searchParams, pathname, router]);

  function openCreateModal() {
    setCreateError("");
    setNewTemplateName("");
    setNewTemplateDescription("");
    setCreateModalOpen(true);
  }

  async function submitCreateModal() {
    setCreateError("");
    const n = newTemplateName.trim();
    if (!n) {
      const msg = "Informe o nome do treino.";
      notify.warning(msg);
      setCreateError(msg);
      return;
    }
    setCreateSubmitting(true);
    try {
      const t = await api<TemplateFull>("/trainer/workout-templates", {
        method: "POST",
        body: JSON.stringify({
          name: n,
          description: newTemplateDescription.trim() || undefined,
          days: [{ dayIndex: 0, name: "Treino", exercises: [] }],
        }),
      });
      setCreateModalOpen(false);
      await loadTemplates();
      selectTemplate(t);
      notify.success("Modelo criado.");
    } catch (e) {
      notify.apiError(e);
      setCreateError(e instanceof Error ? e.message : "Erro ao criar o modelo.");
    } finally {
      setCreateSubmitting(false);
    }
  }

  async function save() {
    if (!selectedId) return;
    setSaveBusy(true);
    const body = {
      name: name.trim() || "Treino",
      description: description.trim() || null,
      days: [
        {
          dayIndex: 0,
          name: "Treino",
          exercises: exercises.map((e, i) => {
            const blocks = normalizeBlocksForSave(e.blocks);
            const first = blocks[0];
            return {
              exerciseId: e.exerciseId,
              orderIndex: i,
              sets: first?.sets ?? e.sets,
              reps: first?.reps ?? e.reps,
              restSec: first?.restSec ?? e.restSec,
              cadence: e.cadence.trim() || undefined,
              notes: e.notes.trim() || undefined,
              prescriptionBlocks: blocks.map((b) => ({
                instructions: b.instructions.trim() || undefined,
                sets: b.sets,
                reps: b.reps,
                weightKg: b.weightKg,
                restSec: b.restSec,
              })),
            };
          }),
        },
      ],
    };
    try {
      await api(`/trainer/workout-templates/${selectedId}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      await loadTemplates();
      if (fromStudentId) {
        router.push(`/trainer/students/${fromStudentId}?treinoSalvo=1`);
      } else {
        router.replace(`${pathname}?treinoSalvo=1`);
      }
    } catch (e) {
      notify.apiError(e);
    } finally {
      setSaveBusy(false);
    }
  }

  async function executeDeleteTemplate() {
    if (!selectedId) return;
    try {
      await api(`/trainer/workout-templates/${selectedId}`, { method: "DELETE" });
      setConfirmDeleteTemplate(false);
      setSelectedId(null);
      setExercises([]);
      notify.success("Modelo excluído.");
      loadTemplates();
    } catch (e) {
      notify.apiError(e);
    }
  }

  function addExercise(exerciseId: string) {
    if (!exerciseId) return;
    setExercises((prev) => [
      ...prev,
      {
        exerciseId,
        orderIndex: prev.length,
        sets: 3,
        reps: "12",
        restSec: 60,
        cadence: "",
        notes: "",
        blocks: [{ instructions: "", sets: 3, reps: "6 a 8", weightKg: 0, restSec: 120 }],
      },
    ]);
  }

  function updateEx(idx: number, patch: Partial<ExerciseDraft>) {
    setExercises((prev) => {
      const ex = [...prev];
      ex[idx] = { ...ex[idx], ...patch };
      return ex;
    });
  }

  function updateBlock(exIdx: number, blockIdx: number, patch: Partial<BlockDraft>) {
    setExercises((prev) => {
      const ex = [...prev];
      const blocks = [...ex[exIdx].blocks];
      blocks[blockIdx] = { ...blocks[blockIdx], ...patch };
      ex[exIdx] = { ...ex[exIdx], blocks };
      return ex;
    });
  }

  function addBlock(exIdx: number) {
    setExercises((prev) => {
      const ex = [...prev];
      ex[exIdx] = {
        ...ex[exIdx],
        blocks: [...ex[exIdx].blocks, { instructions: "", sets: 2, reps: "8 a 10", weightKg: 0, restSec: 120 }],
      };
      return ex;
    });
  }

  function removeBlock(exIdx: number, blockIdx: number) {
    setExercises((prev) => {
      const blocks = prev[exIdx]?.blocks ?? [];
      if (blocks.length <= 1 || blockIdx <= 0) return prev;
      const ex = [...prev];
      ex[exIdx] = {
        ...ex[exIdx],
        blocks: blocks.filter((_, i) => i !== blockIdx),
      };
      return ex;
    });
  }

  function removeEx(idx: number) {
    setExercises((prev) => prev.filter((_, i) => i !== idx));
  }

  function exerciseLabel(id: string) {
    return catalog.find((c) => c.id === id)?.name ?? id;
  }

  return (
    <AppShell role="TRAINER" title="Modelos de treino">
      {fromStudentId && (
        <div className="mb-4 rounded-xl border border-brand-200 bg-brand-50/80 px-4 py-3 text-sm text-brand-950">
          <span className="text-ink-800/85">Você está montando uma ficha ligada à aluna.</span>{" "}
          <Link href={`/trainer/students/${fromStudentId}`} className="font-semibold text-brand-800 underline-offset-2 hover:underline">
            Voltar à página da aluna
          </Link>
        </div>
      )}
      <p className="mb-4 text-sm text-ink-800/75">
        Aqui ficam só os <strong>modelos da biblioteca</strong> (reutilizáveis em várias alunas). Fichas criadas só para uma aluna aparecem só na página dela — você pode abri-las pelo link{" "}
        <strong>Editar ficha</strong>.
      </p>
      <p className="mb-4 text-sm text-ink-800/75">
        Monte <strong>um treino</strong> com a lista de exercícios, <strong>cadência</strong> e <strong>blocos de séries</strong>. O vídeo de execução vem do{" "}
        <strong>banco de exercícios</strong> — a aluna vê ao lado na ficha.
      </p>
      <div className="mb-6 flex flex-wrap gap-2">
        <Button type="button" onClick={openCreateModal}>
          Novo treino
        </Button>
      </div>

      {createModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-3 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-workout-template-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setCreateModalOpen(false);
              setCreateError("");
            }
          }}
        >
          <Card className="w-full max-w-md rounded-2xl p-5 shadow-xl">
            <h2 id="create-workout-template-title" className="font-display text-lg font-bold text-ink-900">
              Novo modelo de treino
            </h2>
            <p className="mt-1 text-sm text-ink-800/75">
              Defina nome e descrição. Depois adicione os exercícios no editor ao lado.
            </p>
            {createError && (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                {createError}
              </p>
            )}
            <label className="mt-4 block text-sm">
              <span className="text-ink-800/70">Nome do treino</span>
              <input
                className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2 text-sm"
                value={newTemplateName}
                onChange={(e) => {
                  setNewTemplateName(e.target.value);
                  if (createError) setCreateError("");
                }}
                placeholder="Ex.: Upper A — foco peito"
                autoFocus
              />
            </label>
            <label className="mt-3 block text-sm">
              <span className="text-ink-800/70">Descrição (opcional)</span>
              <textarea
                className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2 text-sm"
                rows={3}
                value={newTemplateDescription}
                onChange={(e) => setNewTemplateDescription(e.target.value)}
                placeholder="Notas para você ou para a aluna ver na ficha."
              />
            </label>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                disabled={createSubmitting}
                onClick={() => {
                  setCreateModalOpen(false);
                  setCreateError("");
                }}
              >
                Cancelar
              </Button>
              <Button type="button" disabled={createSubmitting} onClick={() => void submitCreateModal()}>
                {createSubmitting ? "Salvando…" : "Salvar treino"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <Card className="h-fit">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Biblioteca</p>
          <ul className="mt-3 space-y-1">
            {templates.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  className={`w-full rounded-lg px-2 py-2 text-left text-sm ${
                    selectedId === t.id ? "bg-brand-100 font-medium text-brand-900" : "hover:bg-brand-50/80"
                  }`}
                  onClick={() => {
                    selectTemplate(t);
                  }}
                >
                  {t.name}
                </button>
              </li>
            ))}
            {selectedId && !templates.some((x) => x.id === selectedId) && (
              <li>
                <button
                  type="button"
                  className="w-full rounded-lg bg-amber-50 px-2 py-2 text-left text-sm font-medium text-amber-950 ring-1 ring-amber-200"
                >
                  {name || "Ficha da aluna"}
                </button>
                <p className="mt-1 px-2 text-[10px] text-ink-800/60">Exclusiva — não aparece na biblioteca</p>
              </li>
            )}
          </ul>
        </Card>

        <div>
          {selectedId ? (
            <Card>
              <div className="flex flex-wrap items-end gap-3">
                <label className="min-w-[200px] flex-1 text-sm">
                  <span className="text-ink-800/70">Nome do treino</span>
                  <input
                    className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2 text-sm"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <Button type="button" variant="outline" onClick={() => setConfirmDeleteTemplate(true)}>
                  Excluir modelo
                </Button>
              </div>
              <label className="mt-3 block text-sm">
                <span className="text-ink-800/70">Descrição</span>
                <textarea
                  className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2 text-sm"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>

              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-brand-800">Exercícios</p>
              <div className="mt-2 space-y-4 rounded-xl border border-brand-100 bg-brand-50/40 p-4">
                {exercises.map((ex, idx) => (
                  <div key={`ex-${idx}-${ex.exerciseId}`} className="space-y-3 rounded-xl border border-brand-200 bg-white/90 p-4 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-ink-900">{exerciseLabel(ex.exerciseId)}</span>
                      <Button type="button" variant="outline" onClick={() => removeEx(idx)}>
                        Remover exercício
                      </Button>
                    </div>
                    <label className="block">
                      <span className="text-ink-800/70">Cadência (execução)</span>
                      <input
                        className="mt-1 w-full rounded-lg border border-brand-200 px-2 py-1.5 text-sm"
                        placeholder="Ex.: 2 segundos em cada fase do movimento"
                        value={ex.cadence}
                        onChange={(e) => updateEx(idx, { cadence: e.target.value })}
                      />
                    </label>
                    <label className="block">
                      <span className="text-ink-800/70">Notas gerais do exercício na ficha (opcional)</span>
                      <textarea
                        className="mt-1 w-full rounded-lg border border-brand-200 px-2 py-1.5 text-sm"
                        rows={2}
                        value={ex.notes}
                        onChange={(e) => updateEx(idx, { notes: e.target.value })}
                      />
                    </label>
                    <p className="text-xs font-semibold text-brand-800">Blocos de séries</p>
                    {ex.blocks.map((b, bi) => (
                      <div
                        key={bi}
                        className="rounded-lg border border-brand-100 bg-brand-50/60 p-3"
                      >
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-brand-100/90 pb-2">
                          <span className="text-xs font-semibold text-ink-800">Bloco {bi + 1}</span>
                          {ex.blocks.length > 1 && bi > 0 ? (
                            <Button
                              type="button"
                              variant="outline"
                              className="shrink-0 border-red-200 px-3 py-1.5 text-xs font-medium text-red-800 hover:border-red-300 hover:bg-red-50"
                              onClick={() => removeBlock(idx, bi)}
                            >
                              Remover bloco
                            </Button>
                          ) : null}
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          <label className="sm:col-span-2 lg:col-span-3">
                            <span className="text-xs text-ink-800/70">Instruções deste bloco</span>
                            <textarea
                              className="mt-1 w-full rounded border border-brand-200 px-2 py-1 text-sm"
                              rows={2}
                              value={b.instructions}
                              onChange={(e) => updateBlock(idx, bi, { instructions: e.target.value })}
                            />
                          </label>
                          <label>
                            Séries
                            <input
                              type="number"
                              min={1}
                              className="mt-1 w-full rounded border border-brand-200 px-2 py-1"
                              value={b.sets}
                              onChange={(e) => updateBlock(idx, bi, { sets: Number(e.target.value) || 1 })}
                            />
                          </label>
                          <label>
                            Reps
                            <input
                              className="mt-1 w-full rounded border border-brand-200 px-2 py-1"
                              value={b.reps}
                              onChange={(e) => updateBlock(idx, bi, { reps: e.target.value })}
                            />
                          </label>
                          <label>
                            Carga (kg)
                            <input
                              type="number"
                              min={0}
                              step={0.5}
                              className="mt-1 w-full rounded border border-brand-200 px-2 py-1"
                              value={b.weightKg}
                              onChange={(e) => updateBlock(idx, bi, { weightKg: Number(e.target.value) || 0 })}
                            />
                          </label>
                          <label>
                            Descanso (s)
                            <input
                              type="number"
                              min={0}
                              className="mt-1 w-full rounded border border-brand-200 px-2 py-1"
                              value={b.restSec}
                              onChange={(e) => updateBlock(idx, bi, { restSec: Number(e.target.value) || 0 })}
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                    <Button type="button" variant="outline" onClick={() => addBlock(idx)}>
                      + Bloco de séries
                    </Button>
                  </div>
                ))}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <select
                    className="rounded-lg border border-brand-200 px-2 py-1 text-sm"
                    defaultValue=""
                    onChange={(e) => {
                      const v = e.target.value;
                      e.target.value = "";
                      addExercise(v);
                    }}
                  >
                    <option value="">+ Adicionar exercício…</option>
                    {catalog.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" disabled={saveBusy} onClick={() => void save()}>
                  {saveBusy ? "Salvando…" : "Salvar treino"}
                </Button>
              </div>
            </Card>
          ) : (
            <Card>
              <p className="text-sm text-ink-800/75">Selecione um modelo à esquerda ou crie um novo.</p>
            </Card>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={confirmDeleteTemplate}
        title="Excluir modelo de treino"
        description={`O modelo "${name || "selecionado"}" será apagado. Vínculos em grupos ou fichas de alunas podem ser afetados — confira antes de confirmar.`}
        confirmLabel="Excluir modelo"
        cancelLabel="Cancelar"
        variant="danger"
        onCancel={() => setConfirmDeleteTemplate(false)}
        onConfirm={executeDeleteTemplate}
      />
    </AppShell>
  );
}
