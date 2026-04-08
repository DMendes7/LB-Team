"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { api } from "@/lib/api";
import { formatWeightsRecorded } from "@/lib/workout-weights";
import { AppShell } from "@/components/AppShell";
import { StreakFireIcon } from "@/components/icons/StreakFireIcon";
import { Button, Card } from "@/components/ui";
import clsx from "clsx";

type StudentUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  profile: { weightKg: number | null; heightCm: number | null } | null;
  studentProfile: {
    fitnessLevel: string | null;
    goal: string | null;
    weeklyTarget: string | null;
  } | null;
  userLevel: { currentLevel: number; consistencyWeeks: number } | null;
  streakState: {
    currentStreak: number;
    maxStreak: number;
    lastActivityAt: string | null;
    fireOn: boolean;
  };
};

type SlotRow = {
  id: string;
  label: string;
  sortOrder: number;
  templateId: string;
  template: { id: string; name: string; description: string | null; privateForStudentId?: string | null };
};

type SessionSummary = {
  id: string;
  completedAt: string;
  durationSeconds: number | null;
  templateName: string;
};

type CompletionDetail = {
  id: string;
  completedAt: string | null;
  startedAt: string;
  durationSeconds: number | null;
  dayFeeling: string | null;
  notes: string | null;
  template: { name: string } | null;
  exerciseCompletions: {
    orderIndex: number;
    skipped: boolean;
    completedAt: string | null;
    weightKg: number | null;
    weightsSeries?: unknown;
    exercise: { id: string; name: string };
  }[];
};

type DetailRes = {
  student: StudentUser;
  insights: {
    trainingMonth: {
      year: number;
      month: number;
      trainedDates: string[];
      sessionsByDate: Record<string, SessionSummary[]>;
    };
    slots: SlotRow[];
    workoutGroups: { groupId: string; name: string; templateName: string }[];
    workoutAssignment:
      | {
          kind: "slots";
          slots: { id: string; label: string; template: { id: string; name: string } }[];
        }
      | {
          kind: "override" | "group" | "none";
          template: { id: string; name: string; description: string | null } | null;
          groupName: string | null;
        }
      | {
          kind: "groups";
          groups: {
            groupName: string;
            template: { id: string; name: string; description: string | null };
          }[];
        };
  };
};

type TemplateOpt = { id: string; name: string };
type GroupOpt = { id: string; name: string; templateId: string };

type WorkoutSlotCreated = {
  id: string;
  templateId: string;
  template: { id: string; name: string };
};

function monthKey(d: Date) {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

function levelPt(l: string | null) {
  if (!l) return "—";
  const map: Record<string, string> = {
    BEGINNER: "Iniciante",
    INTERMEDIATE: "Intermediário",
    ADVANCED: "Avançado",
  };
  return map[l] ?? l;
}

function formatSessionDur(s: number | null) {
  if (s == null) return "—";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}min`;
  if (m > 0) return `${m} min ${sec}s`;
  return `${sec}s`;
}

function TrainerStudentDetailPageInner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [data, setData] = useState<DetailRes | null>(null);
  const [templates, setTemplates] = useState<TemplateOpt[]>([]);
  const [groups, setGroups] = useState<GroupOpt[]>([]);
  const [pickGroup, setPickGroup] = useState("");
  const [addingAnotherGroup, setAddingAnotherGroup] = useState(false);
  const [groupToRemove, setGroupToRemove] = useState<{ id: string; name: string } | null>(null);
  const [slotToRemove, setSlotToRemove] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [libraryModalOpen, setLibraryModalOpen] = useState(false);
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [libLabel, setLibLabel] = useState("");
  const [libTemplateId, setLibTemplateId] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [slotSaving, setSlotSaving] = useState(false);
  const [libraryModalError, setLibraryModalError] = useState("");
  const [customModalError, setCustomModalError] = useState("");
  const [workoutDayModal, setWorkoutDayModal] = useState<string | null>(null);
  const [workoutDetail, setWorkoutDetail] = useState<CompletionDetail | null>(null);
  const [workoutDetailLoading, setWorkoutDetailLoading] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    api<DetailRes>(`/trainer/students/${id}?month=${month}`).then(setData).catch(() => setData(null));
  }, [id, month]);

  useEffect(() => {
    load();
  }, [load]);

  const [treinoSalvoFlash, setTreinoSalvoFlash] = useState(false);
  useEffect(() => {
    if (searchParams.get("treinoSalvo") !== "1" || !id) return;
    setTreinoSalvoFlash(true);
    setMsg(null);
    router.replace(pathname);
    load();
  }, [searchParams, id, pathname, router, load]);

  useEffect(() => {
    api<TemplateOpt[]>("/trainer/workout-templates").then((rows) =>
      setTemplates(rows.map((t) => ({ id: t.id, name: t.name }))),
    );
    api<GroupOpt[]>("/trainer/workout-groups").then(setGroups);
  }, []);

  /** Se o modal abrir antes da lista de modelos carregar, o select ficava sem valor — botão não funcionava. */
  useEffect(() => {
    if (!libraryModalOpen || templates.length === 0) return;
    setLibTemplateId((prev) => (prev && templates.some((t) => t.id === prev) ? prev : templates[0].id));
  }, [libraryModalOpen, templates]);

  const calendar = useMemo(() => {
    if (!data) {
      return {
        cells: [] as { key: string; inMonth: boolean; trained: boolean; isToday: boolean }[],
        label: "",
        sessionsByDate: {} as Record<string, SessionSummary[]>,
      };
    }
    const { year, month: m, trainedDates, sessionsByDate } = data.insights.trainingMonth;
    const first = new Date(Date.UTC(year, m - 1, 1));
    const last = new Date(Date.UTC(year, m, 0));
    const startPad = first.getUTCDay();
    const daysInMonth = last.getUTCDate();
    const set = new Set(trainedDates);
    const now = new Date();
    const todayKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
    const cells: { key: string; inMonth: boolean; trained: boolean; isToday: boolean }[] = [];
    for (let i = 0; i < startPad; i++) {
      cells.push({ key: `p-${i}`, inMonth: false, trained: false, isToday: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ key, inMonth: true, trained: set.has(key), isToday: key === todayKey });
    }
    const label = new Date(Date.UTC(year, m - 1, 1)).toLocaleString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
    return { cells, label, sessionsByDate };
  }, [data]);

  function shiftMonth(delta: number) {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    setMonth(monthKey(d));
  }

  async function openTrainerWorkoutDetail(completionId: string) {
    if (!id) return;
    setWorkoutDetailLoading(true);
    setWorkoutDetail(null);
    try {
      const d = await api<CompletionDetail>(
        `/trainer/students/${id}/workout-completions/${completionId}`,
      );
      setWorkoutDetail(d);
    } catch {
      setWorkoutDetail(null);
    } finally {
      setWorkoutDetailLoading(false);
    }
  }

  async function addToGroup() {
    if (!id || !pickGroup) return;
    setMsg(null);
    try {
      await api(`/trainer/workout-groups/${pickGroup}/members`, {
        method: "POST",
        body: JSON.stringify({ studentIds: [id] }),
      });
      setMsg("Aluna incluída no grupo.");
      setPickGroup("");
      setAddingAnotherGroup(false);
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erro");
    }
  }

  async function executeRemoveFromGroup() {
    if (!id || !groupToRemove) return;
    setMsg(null);
    try {
      await api(`/trainer/workout-groups/${groupToRemove.id}/members/${id}`, { method: "DELETE" });
      setGroupToRemove(null);
      setMsg("Aluna removida do grupo.");
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erro");
    }
  }

  function editorHref(templateId: string) {
    return `/trainer/workouts?t=${encodeURIComponent(templateId)}&fromStudent=${encodeURIComponent(id ?? "")}`;
  }

  async function submitLibrarySlot() {
    setLibraryModalError("");
    if (!id) return;
    if (!libLabel.trim()) {
      setLibraryModalError("Informe o nome que a aluna vê na lista (obrigatório).");
      return;
    }
    if (!templates.length) {
      setLibraryModalError("Não há modelos na biblioteca. Crie um na aba Treinos e volte aqui.");
      return;
    }
    const tplId = libTemplateId && templates.some((t) => t.id === libTemplateId) ? libTemplateId : templates[0].id;
    if (!tplId) {
      setLibraryModalError("Escolha um modelo da biblioteca.");
      return;
    }
    setMsg(null);
    setSlotSaving(true);
    try {
      await api(`/trainer/students/${id}/workout-slots`, {
        method: "POST",
        body: JSON.stringify({ label: libLabel.trim(), templateId: tplId }),
      });
      setLibLabel("");
      setLibTemplateId("");
      setLibraryModalOpen(false);
      setLibraryModalError("");
      setMsg("Treino da biblioteca vinculado.");
      load();
    } catch (e) {
      setLibraryModalError(e instanceof Error ? e.message : "Não foi possível vincular. Tente de novo.");
    } finally {
      setSlotSaving(false);
    }
  }

  async function submitCustomSheetAndOpenEditor() {
    setCustomModalError("");
    if (!id || !customLabel.trim()) {
      setCustomModalError("Dê um nome ao treino — é assim que a aluna identifica na lista (obrigatório).");
      return;
    }
    setMsg(null);
    setSlotSaving(true);
    try {
      const created = await api<WorkoutSlotCreated>(`/trainer/students/${id}/workout-slots`, {
        method: "POST",
        body: JSON.stringify({ label: customLabel.trim() }),
      });
      setCustomLabel("");
      setCustomModalOpen(false);
      setCustomModalError("");
      router.push(editorHref(created.template.id));
    } catch (e) {
      setCustomModalError(e instanceof Error ? e.message : "Não foi possível criar. Tente de novo.");
    } finally {
      setSlotSaving(false);
    }
  }

  async function executeRemoveSlot() {
    if (!id || !slotToRemove) return;
    setMsg(null);
    try {
      await api(`/trainer/students/${id}/workout-slots/${slotToRemove}`, { method: "DELETE" });
      setSlotToRemove(null);
      setMsg("Treino removido da aluna.");
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erro");
    }
  }

  const s = data?.student;
  const wa = data?.insights.workoutAssignment;
  const slotRows = data?.insights.slots ?? [];
  const workoutGroups = data?.insights.workoutGroups ?? [];
  const groupIdsEnrolled = useMemo(() => new Set(workoutGroups.map((g) => g.groupId)), [workoutGroups]);
  const groupsAvailableToAdd = useMemo(
    () => groups.filter((g) => !groupIdsEnrolled.has(g.id)),
    [groups, groupIdsEnrolled],
  );
  const showGroupAddRow = workoutGroups.length === 0 || addingAnotherGroup;

  function openLibraryModal() {
    setMsg(null);
    setLibraryModalError("");
    setLibLabel("");
    setLibTemplateId(templates[0]?.id ?? "");
    setLibraryModalOpen(true);
  }

  function openCustomModal() {
    setMsg(null);
    setCustomModalError("");
    setCustomLabel("");
    setCustomModalOpen(true);
  }

  return (
    <AppShell role="TRAINER" title={s?.name ?? "Aluna"}>
      {treinoSalvoFlash && (
        <p
          className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900"
          role="status"
        >
          Treino salvo com sucesso. A ficha já está atualizada para a aluna.
        </p>
      )}
      {msg && <p className="mb-3 text-sm text-brand-800">{msg}</p>}

      {!data && <p className="text-sm text-ink-800/75">Carregando…</p>}

      {s && (
        <div className="space-y-4">
          <Card>
            <h2 className="font-display text-lg font-semibold text-ink-900">Dados</h2>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-ink-800/60">E-mail</dt>
                <dd>{s.email}</dd>
              </div>
              <div>
                <dt className="text-ink-800/60">Telefone</dt>
                <dd>{s.phone ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-ink-800/60">Nível</dt>
                <dd>{levelPt(s.studentProfile?.fitnessLevel ?? null)}</dd>
              </div>
              <div>
                <dt className="text-ink-800/60">Meta / frequência</dt>
                <dd>
                  {s.studentProfile?.goal ?? "—"} · {s.studentProfile?.weeklyTarget ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-ink-800/60">Nível gamificado</dt>
                <dd>{s.userLevel ? `Nv. ${s.userLevel.currentLevel} · ${s.userLevel.consistencyWeeks} sem. consistentes` : "—"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-ink-800/60">Sequência de treinos</dt>
                <dd className="flex items-center gap-2 text-ink-900">
                  <span
                    className={clsx(
                      "inline-flex shrink-0",
                      s.streakState.fireOn ? "opacity-90" : "grayscale opacity-55",
                    )}
                    aria-hidden
                  >
                    <StreakFireIcon active={s.streakState.fireOn} className="h-5 w-5" />
                  </span>
                  <span>
                    {s.streakState.currentStreak}{" "}
                    {s.streakState.currentStreak === 1 ? "dia" : "dias"} · máx. {s.streakState.maxStreak}
                    <span className="text-ink-800/50">
                      {" "}
                      ({s.streakState.fireOn ? "ativa" : "inativa"} · UTC)
                    </span>
                  </span>
                </dd>
              </div>
            </dl>
          </Card>

          <Card>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold text-ink-900">Treinos vinculados</h2>
                <p className="mt-2 max-w-2xl text-sm text-ink-800/80">
                  Cada card é um treino que a aluna vê no app. Inclua um <strong>modelo pronto</strong> (criado na aba Treinos)
                  ou <strong>monte uma ficha nova</strong> exercício a exercício — essa ficha fica só dela e não aparece na
                  biblioteca geral.
                </p>
                <p className="mt-2 text-xs text-ink-800/60">
                  Enquanto houver treinos aqui, <strong>só eles</strong> contam para ela (grupo fica em segundo plano).
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={openLibraryModal}>
                  + Da biblioteca
                </Button>
                <Button type="button" className="w-full sm:w-auto" onClick={openCustomModal}>
                  + Montar ficha nova
                </Button>
              </div>
            </div>

            {slotRows.length > 0 ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {slotRows.map((row) => (
                  <Card
                    key={row.id}
                    className="flex flex-col border-brand-200/90 bg-gradient-to-b from-white to-brand-50/40 p-4 shadow-sm"
                  >
                    <div className="min-h-[4.5rem] flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold leading-snug text-ink-900">{row.label}</h3>
                        {row.template.privateForStudentId ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
                            Só dela
                          </span>
                        ) : (
                          <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-900">
                            Biblioteca
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-ink-800/70">
                        Ficha técnica: <span className="font-medium text-ink-800">{row.template.name}</span>
                      </p>
                    </div>
                    <div className="mt-4 flex flex-col gap-2 border-t border-brand-100 pt-4">
                      <Link
                        href={editorHref(row.templateId)}
                        className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-3 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-700"
                      >
                        Abrir e editar ficha
                      </Link>
                      <Button type="button" variant="ghost" className="text-ink-800/80" onClick={() => setSlotToRemove(row.id)}>
                        Remover da aluna
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={openLibraryModal}
                  className="rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50/50 p-6 text-left transition-colors hover:border-brand-400 hover:bg-brand-50"
                >
                  <p className="font-display text-base font-semibold text-ink-900">Incluir treino da biblioteca</p>
                  <p className="mt-2 text-sm text-ink-800/75">
                    Escolha um modelo que você já criou na aba <strong>Treinos</strong> e defina o nome que a aluna vê.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={openCustomModal}
                  className="rounded-2xl border-2 border-dashed border-amber-300/90 bg-amber-50/40 p-6 text-left transition-colors hover:border-amber-400 hover:bg-amber-50/70"
                >
                  <p className="font-display text-base font-semibold text-ink-900">Montar ficha só para ela</p>
                  <p className="mt-2 text-sm text-ink-800/75">
                    Criamos uma ficha vazia e você adiciona <strong>exercício por exercício</strong> no editor (cadência,
                    séries, blocos).
                  </p>
                </button>
              </div>
            )}

            <div className="mt-6 border-t border-brand-100 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-800">Grupo de treino</p>
              <p className="mt-1 text-xs text-ink-800/65">
                Um grupo usa um único modelo para várias alunas. Se não houver treinos nomeados acima, a aluna vê{" "}
                <strong>cada grupo</strong> como um item na lista dela (vários grupos são permitidos).
              </p>

              {workoutGroups.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {workoutGroups.map((wg) => (
                    <li
                      key={wg.groupId}
                      className="flex flex-col gap-2 rounded-xl border border-brand-200/90 bg-brand-50/40 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold text-ink-900">{wg.name}</p>
                        <p className="text-xs text-ink-800/65">
                          Ficha do grupo: <span className="font-medium text-ink-800">{wg.templateName}</span>
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="shrink-0"
                        onClick={() => setGroupToRemove({ id: wg.groupId, name: wg.name })}
                      >
                        Remover do grupo
                      </Button>
                    </li>
                  ))}
                </ul>
              )}

              {showGroupAddRow && groupsAvailableToAdd.length > 0 && (
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
                  <label className="text-sm">
                    <span className="text-ink-800/70">Grupo</span>
                    <select
                      className="mt-1 block w-full min-w-[200px] rounded-xl border border-brand-200 px-3 py-2 text-sm"
                      value={pickGroup}
                      onChange={(e) => setPickGroup(e.target.value)}
                    >
                      <option value="">Escolha um grupo…</option>
                      {groupsAvailableToAdd.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Button type="button" variant="outline" onClick={() => void addToGroup()} disabled={!pickGroup}>
                    Incluir aluna no grupo
                  </Button>
                </div>
              )}

              {workoutGroups.length > 0 && !addingAnotherGroup && groupsAvailableToAdd.length > 0 && (
                <button
                  type="button"
                  className="mt-3 text-left text-xs font-medium text-brand-600 hover:text-brand-700 hover:underline"
                  onClick={() => {
                    setPickGroup("");
                    setAddingAnotherGroup(true);
                  }}
                >
                  + Incluir em outro grupo
                </button>
              )}

              {addingAnotherGroup && workoutGroups.length > 0 && (
                <button
                  type="button"
                  className="mt-2 text-xs text-ink-800/60 hover:text-ink-800"
                  onClick={() => {
                    setAddingAnotherGroup(false);
                    setPickGroup("");
                  }}
                >
                  Cancelar
                </button>
              )}

              {showGroupAddRow && groupsAvailableToAdd.length === 0 && groups.length > 0 && workoutGroups.length > 0 && (
                <p className="mt-3 text-xs text-ink-800/60">A aluna já está em todos os seus grupos.</p>
              )}

              {groups.length === 0 && (
                <p className="mt-3 text-xs text-ink-800/60">
                  Não há grupos criados. Crie um na aba <strong>Treinos</strong> para poder incluir alunas.
                </p>
              )}

              {wa?.kind === "override" && slotRows.length === 0 && (
                <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-950 ring-1 ring-amber-200/80">
                  Ainda há um <strong>plano único antigo</strong> na conta dela ({wa.template?.name ?? "modelo"}). Inclua
                  treinos vinculados acima para padronizar; o app continua usando esse plano até existir pelo menos um
                  treino na lista.
                </p>
              )}
            </div>

            <p className="mt-4 text-xs text-ink-800/55">
              Dieta continua apenas com a nutricionista. Para a aluna: primeiro os <strong>treinos vinculados</strong> acima;
              se a lista estiver vazia, contam os <strong>grupos</strong> (cada um com o seu modelo) ou um plano único
              antigo, se existir.
            </p>
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold text-ink-900">Treinos no mês</h2>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => shiftMonth(-1)}>
                  ←
                </Button>
                <Button type="button" variant="outline" onClick={() => shiftMonth(1)}>
                  →
                </Button>
              </div>
            </div>
            <p className="mt-1 capitalize text-sm text-ink-800/70">{calendar.label}</p>
            <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
                <div key={d} className="font-semibold text-ink-800/50">
                  {d}
                </div>
              ))}
              {calendar.cells.map((c) =>
                c.inMonth ? (
                  <button
                    key={c.key}
                    type="button"
                    disabled={!c.trained}
                    onClick={() => {
                      if (c.trained) setWorkoutDayModal(c.key);
                    }}
                    className={`rounded-lg py-2 ${
                      c.trained
                        ? "cursor-pointer bg-brand-500 font-semibold text-white hover:bg-brand-600"
                        : "cursor-default bg-brand-50/80 text-ink-800"
                    } ${
                      c.isToday
                        ? c.trained
                          ? "ring-2 ring-white/90 ring-offset-2 ring-offset-brand-500"
                          : "ring-2 ring-brand-600 ring-offset-2 ring-offset-white"
                        : ""
                    }`}
                  >
                    {Number(c.key.slice(-2))}
                  </button>
                ) : (
                  <div key={c.key} className="py-2 text-transparent">
                    ·
                  </div>
                ),
              )}
            </div>
            <p className="mt-2 text-xs text-ink-800/60">
              Toque num dia em destaque para ver o registro (exercícios, pesos, duração). UTC. Contorno = hoje (UTC).
            </p>
          </Card>
        </div>
      )}

      {libraryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-3 sm:items-center">
          <Card className="w-full max-w-md rounded-2xl p-5 shadow-xl">
            <p className="font-display text-lg font-bold text-ink-900">Incluir da biblioteca</p>
            <p className="mt-1 text-sm text-ink-800/75">
              Modelos prontos vêm da aba <strong>Treinos</strong>. O <strong>nome para a aluna</strong> é obrigatório — é o
              título dela no app.
            </p>
            {libraryModalError && (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                {libraryModalError}
              </p>
            )}
            <label className="mt-4 block text-sm">
              <span className="text-ink-800/70">Nome para a aluna (obrigatório)</span>
              <input
                className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm ${
                  libraryModalError && !libLabel.trim() ? "border-red-400 ring-1 ring-red-200" : "border-brand-200"
                }`}
                placeholder="Ex.: Treino A — Membros inferiores"
                value={libLabel}
                aria-invalid={!libLabel.trim() && !!libraryModalError}
                onChange={(e) => {
                  setLibLabel(e.target.value);
                  if (libraryModalError) setLibraryModalError("");
                }}
              />
            </label>
            <label className="mt-3 block text-sm">
              <span className="text-ink-800/70">Modelo da biblioteca</span>
              <select
                className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2 text-sm"
                value={libTemplateId && templates.some((t) => t.id === libTemplateId) ? libTemplateId : templates[0]?.id ?? ""}
                onChange={(e) => {
                  setLibTemplateId(e.target.value);
                  if (libraryModalError) setLibraryModalError("");
                }}
                disabled={!templates.length}
              >
                {templates.length === 0 ? (
                  <option value="">Nenhum modelo — crie na aba Treinos</option>
                ) : (
                  templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))
                )}
              </select>
            </label>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                disabled={slotSaving}
                onClick={() => {
                  setLibraryModalOpen(false);
                  setLibraryModalError("");
                }}
              >
                Cancelar
              </Button>
              <Button type="button" disabled={slotSaving} onClick={() => void submitLibrarySlot()}>
                {slotSaving ? "Salvando…" : "Vincular treino"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {customModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-3 sm:items-center">
          <Card className="w-full max-w-md rounded-2xl p-5 shadow-xl">
            <p className="font-display text-lg font-bold text-ink-900">Nova ficha para ela</p>
            <p className="mt-1 text-sm text-ink-800/75">
              Vamos criar uma ficha <strong>exclusiva</strong> (não entra na biblioteca). Em seguida você abre o editor e
              vai adicionando <strong>cada exercício</strong>, séries e blocos.
            </p>
            {customModalError && (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                {customModalError}
              </p>
            )}
            <label className="mt-4 block text-sm">
              <span className="text-ink-800/70">Nome do treino na lista da aluna (obrigatório)</span>
              <input
                className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm ${
                  customModalError && !customLabel.trim() ? "border-red-400 ring-1 ring-red-200" : "border-brand-200"
                }`}
                placeholder="Ex.: Treino B — Glúteo"
                value={customLabel}
                aria-invalid={!customLabel.trim() && !!customModalError}
                onChange={(e) => {
                  setCustomLabel(e.target.value);
                  if (customModalError) setCustomModalError("");
                }}
              />
            </label>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                disabled={slotSaving}
                onClick={() => {
                  setCustomModalOpen(false);
                  setCustomModalError("");
                }}
              >
                Cancelar
              </Button>
              <Button type="button" disabled={slotSaving} onClick={() => void submitCustomSheetAndOpenEditor()}>
                {slotSaving ? "Criando…" : "Criar e abrir editor"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {workoutDayModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-3 sm:items-center"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => e.target === e.currentTarget && setWorkoutDayModal(null)}
        >
          <Card className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl p-4 shadow-xl">
            <p className="font-display font-bold text-ink-900">Treinos em {workoutDayModal}</p>
            <ul className="mt-3 space-y-2">
              {(calendar.sessionsByDate[workoutDayModal] ?? []).map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className="w-full rounded-xl border border-brand-100 bg-brand-50/50 px-3 py-3 text-left hover:bg-brand-50"
                    onClick={() => {
                      setWorkoutDayModal(null);
                      void openTrainerWorkoutDetail(s.id);
                    }}
                  >
                    <p className="font-medium text-ink-900">{s.templateName}</p>
                    <p className="text-xs text-ink-800/65">
                      {new Date(s.completedAt).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      · {formatSessionDur(s.durationSeconds)}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
            <Button type="button" variant="ghost" className="mt-4 w-full" onClick={() => setWorkoutDayModal(null)}>
              Fechar
            </Button>
          </Card>
        </div>
      )}

      {(workoutDetail || workoutDetailLoading) && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-ink-900/40 p-3 sm:items-center"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => e.target === e.currentTarget && setWorkoutDetail(null)}
        >
          <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl p-4 shadow-xl">
            {workoutDetailLoading && <p className="text-sm text-ink-800/70">Carregando…</p>}
            {workoutDetail && !workoutDetailLoading && (
              <>
                <p className="font-display font-bold text-ink-900">{workoutDetail.template?.name ?? "Treino"}</p>
                <p className="mt-1 text-xs text-ink-800/65">
                  {workoutDetail.completedAt
                    ? new Date(workoutDetail.completedAt).toLocaleString("pt-BR")
                    : "—"}
                </p>
                <p className="mt-2 text-sm text-ink-800">
                  <strong>Duração:</strong> {formatSessionDur(workoutDetail.durationSeconds)}
                </p>
                {workoutDetail.dayFeeling && (
                  <p className="mt-1 text-sm text-ink-800">
                    <strong>Esforço (relato):</strong> {workoutDetail.dayFeeling}
                  </p>
                )}
                {workoutDetail.notes && (
                  <p className="mt-2 rounded-lg bg-brand-50/80 p-2 text-sm text-ink-800">
                    <strong>Nota da aluna:</strong> {workoutDetail.notes}
                  </p>
                )}
                <p className="mt-4 text-xs font-semibold uppercase text-brand-800">Exercícios</p>
                <ul className="mt-2 space-y-2">
                  {workoutDetail.exerciseCompletions.map((e) => {
                    const wtxt = formatWeightsRecorded(e.weightsSeries, e.weightKg);
                    return (
                      <li key={e.orderIndex} className="rounded-lg border border-brand-100 px-3 py-2 text-sm">
                        <span className="font-medium text-ink-900">{e.exercise.name}</span>
                        <span className="mt-1 block text-xs text-ink-800/75">
                          {e.skipped ? "Pulado" : e.completedAt ? "Feito" : "Não concluído"}
                          {wtxt ? (
                            <span className="mt-0.5 block text-ink-800/90">Cargas: {wtxt}</span>
                          ) : null}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <Button type="button" variant="ghost" className="mt-4 w-full" onClick={() => setWorkoutDetail(null)}>
                  Fechar
                </Button>
              </>
            )}
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={!!slotToRemove}
        title="Remover ficha da lista da aluna"
        description={
          slotRows.find((r) => r.id === slotToRemove)?.template.privateForStudentId
            ? "A entrada some do app dela. Como a ficha era exclusiva desta aluna e deixa de ser usada, ela será apagada."
            : "A entrada some do app dela. O modelo continua na aba Treinos (biblioteca) para reutilizar."
        }
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        variant="danger"
        onCancel={() => setSlotToRemove(null)}
        onConfirm={executeRemoveSlot}
      />

      <ConfirmDialog
        open={!!groupToRemove}
        title="Remover aluna do grupo"
        description={
          groupToRemove
            ? `A aluna deixa de fazer parte de “${groupToRemove.name}”. O grupo e o modelo de treino continuam na sua conta.`
            : ""
        }
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        variant="danger"
        onCancel={() => setGroupToRemove(null)}
        onConfirm={() => void executeRemoveFromGroup()}
      />
    </AppShell>
  );
}

export default function TrainerStudentDetailPage() {
  return (
    <Suspense
      fallback={
        <AppShell role="TRAINER" title="Aluna">
          <p className="text-sm text-ink-800/75">Carregando…</p>
        </AppShell>
      }
    >
      <TrainerStudentDetailPageInner />
    </Suspense>
  );
}
