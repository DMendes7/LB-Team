"use client";

import clsx from "clsx";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import {
  formatYmdBrazil,
  formatYmdBrazilLong,
  presetMonth,
  presetWeek,
  presetYear,
} from "@/lib/trainer-dashboard-dates";
import { notify } from "@/lib/notify";
import { AppShell } from "@/components/AppShell";
import { Button, Card } from "@/components/ui";

type Metrics = {
  workoutsCompleted: number;
  studentsTrained: number;
  engagementRate: number;
  studentsInactive: number;
  totalMinutes: number;
  avgMinutesPerWorkout: number;
  avgWorkoutsPerTrainingStudent: number;
  checkInsCount: number;
  studentsWithCheckIn: number;
};

type FilterMeta = {
  scope: "all" | "group" | "student";
  groupId: string | null;
  groupName: string | null;
  studentId: string | null;
  studentName: string | null;
};

type DashboardPayload = {
  activeStudents: number;
  filter: FilterMeta;
  period: { fromDay: string; toDay: string };
  metrics: Metrics;
  activityByDay: { date: string; count: number }[];
  inactiveSample: { id: string; name: string }[];
  groups: {
    id: string;
    name: string;
    _count: { members: number };
    template: { name: string } | null;
    days?: { dayOfWeek: number }[];
  }[];
};

type TrainerStudentRow = {
  studentId: string;
  student: { id: string; name: string | null; email: string };
};

type GroupDetail = {
  id: string;
  members: { studentId: string }[];
};

type Preset = "week" | "month" | "year" | "custom";

const CHART_INNER_PX = 120;

function buildDashboardQuery(from: string, to: string, f: { groupId: string; studentId: string }) {
  const q = new URLSearchParams({ from, to });
  if (f.groupId.trim()) q.set("groupId", f.groupId.trim());
  if (f.studentId.trim()) q.set("studentId", f.studentId.trim());
  return `/trainer/dashboard?${q.toString()}`;
}

/** Evita sobrepor rótulos quando há muitos dias no eixo X. */
function shouldShowDayLabel(index: number, total: number): boolean {
  if (total <= 14) return true;
  if (total <= 31) return index % 2 === 0 || index === total - 1;
  const step = Math.max(1, Math.ceil(total / 12));
  return index % step === 0 || index === total - 1;
}

export default function TrainerDashboardPage() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const [preset, setPreset] = useState<Preset>("week");
  const [fromDraft, setFromDraft] = useState("");
  const [toDraft, setToDraft] = useState("");
  const [draftGroupId, setDraftGroupId] = useState("");
  const [draftStudentId, setDraftStudentId] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({ groupId: "", studentId: "" });

  const [students, setStudents] = useState<TrainerStudentRow[]>([]);
  const [groupsForFilter, setGroupsForFilter] = useState<DashboardPayload["groups"]>([]);
  const [memberIds, setMemberIds] = useState<Set<string> | null>(null);

  useEffect(() => {
    api<TrainerStudentRow[]>("/trainer/students")
      .then(setStudents)
      .catch((e) => notify.apiError(e));
    api<DashboardPayload["groups"]>("/trainer/workout-groups")
      .then(setGroupsForFilter)
      .catch(() => setGroupsForFilter([]));
  }, []);

  useEffect(() => {
    if (!draftGroupId || !memberIds || !draftStudentId) return;
    if (!memberIds.has(draftStudentId)) setDraftStudentId("");
  }, [draftGroupId, memberIds, draftStudentId]);

  useEffect(() => {
    if (!draftGroupId) {
      setMemberIds(null);
      return;
    }
    let cancelled = false;
    api<GroupDetail>(`/trainer/workout-groups/${encodeURIComponent(draftGroupId)}`)
      .then((g) => {
        if (!cancelled) setMemberIds(new Set(g.members.map((m) => m.studentId)));
      })
      .catch(() => {
        if (!cancelled) setMemberIds(null);
      });
    return () => {
      cancelled = true;
    };
  }, [draftGroupId]);

  const studentOptions = useMemo(() => {
    if (!students.length) return [];
    if (memberIds && draftGroupId) {
      return students.filter((s) => memberIds.has(s.student.id));
    }
    return students;
  }, [students, memberIds, draftGroupId]);

  const load = useCallback(async (from: string, to: string, filters: { groupId: string; studentId: string }) => {
    setLoading(true);
    try {
      const d = await api<DashboardPayload>(buildDashboardQuery(from, to, filters));
      setData(d);
      setAppliedFilters({ groupId: filters.groupId, studentId: filters.studentId });
    } catch (e) {
      notify.apiError(e);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const w = presetWeek();
    void load(w.from, w.to, { groupId: "", studentId: "" });
  }, [load]);

  const periodLabel = useMemo(() => {
    if (!data) return "";
    const a = formatYmdBrazil(data.period.fromDay);
    const b = formatYmdBrazil(data.period.toDay);
    if (data.period.fromDay === data.period.toDay) return a;
    return `${a} – ${b}`;
  }, [data]);

  const scopeSubtitle = useMemo(() => {
    if (!data?.filter) return null;
    const f = data.filter;
    if (f.scope === "student" && f.studentName) {
      return f.groupName ? `${f.studentName} · ${f.groupName}` : f.studentName;
    }
    if (f.scope === "group" && f.groupName) return f.groupName;
    return "Todas as alunas vinculadas";
  }, [data]);

  function setPresetAndDrafts(p: Preset) {
    setPreset(p);
    if (p === "week") {
      const w = presetWeek();
      setFromDraft(w.from);
      setToDraft(w.to);
    } else if (p === "month") {
      const m = presetMonth();
      setFromDraft(m.from);
      setToDraft(m.to);
    } else if (p === "year") {
      const y = presetYear();
      setFromDraft(y.from);
      setToDraft(y.to);
    }
  }

  function openFilter() {
    setFilterOpen(true);
    const base = data ? { from: data.period.fromDay, to: data.period.toDay } : presetWeek();
    setFromDraft(base.from);
    setToDraft(base.to);
    setDraftGroupId(appliedFilters.groupId);
    setDraftStudentId(appliedFilters.studentId);
    setPreset("custom");
  }

  function runApplyWithDates(from: string, to: string) {
    const f = { groupId: draftGroupId, studentId: draftStudentId };
    void load(from, to, f);
    setFilterOpen(false);
  }

  function applyFilterCustomDates() {
    const f = fromDraft.trim();
    const t = toDraft.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f) || !/^\d{4}-\d{2}-\d{2}$/.test(t)) {
      notify.warning("Use datas válidas (AAAA-MM-DD).");
      return;
    }
    if (f > t) {
      notify.warning("A data inicial deve ser anterior à final.");
      return;
    }
    runApplyWithDates(f, t);
  }

  const maxActivity = useMemo(() => Math.max(1, ...(data?.activityByDay.map((a) => a.count) ?? [1])), [data]);

  const chartWide = (data?.activityByDay.length ?? 0) > 21;

  const activityTotalInChart = useMemo(
    () => (data?.activityByDay ?? []).reduce((s, a) => s + a.count, 0),
    [data],
  );

  const showValueOnBar = (data?.activityByDay.length ?? 0) <= 16;

  const firstCardLabel = data?.filter.scope === "student" ? "Aluna" : data?.filter.scope === "group" ? "No grupo" : "Alunas no recorte";
  const firstCardHint =
    data?.filter.scope === "student"
      ? data.filter.studentName ?? "Foco individual"
      : data?.filter.scope === "group"
        ? "Membros do grupo (vinculadas a você)"
        : "Total no filtro atual";

  return (
    <AppShell role="TRAINER" title="Painel">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-ink-800/75">
            Visão de engajamento: treinos concluídos no app, tempo registrado e check-ins. Use o filtro para período,
            grupo ou aluna.
          </p>
          {data && !loading && (
            <>
              <p className="mt-2 font-display text-sm font-semibold text-brand-800">
                Período: <span className="text-ink-900">{periodLabel}</span>
              </p>
              {scopeSubtitle && (
                <p className="mt-1 text-xs font-medium text-ink-800/80">
                  Recorte: <span className="text-ink-900">{scopeSubtitle}</span>
                </p>
              )}
            </>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          className="shrink-0 gap-2 border-brand-200 shadow-sm transition hover:border-brand-300 hover:shadow"
          onClick={() => (filterOpen ? setFilterOpen(false) : openFilter())}
        >
          <IconFilter className="h-4 w-4" />
          Filtros
          <span
            className={clsx(
              "inline-block transition-transform duration-300",
              filterOpen ? "rotate-180" : "rotate-0",
            )}
          >
            ▼
          </span>
        </Button>
      </div>

      <div
        className={clsx(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          filterOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <Card
            className={clsx(
              "mb-6 border-brand-100/80 shadow-card transition-all duration-300",
              filterOpen ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-90",
            )}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-800">Alunas e grupos</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-ink-800/70">Grupo</span>
                <select
                  className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2 text-sm"
                  value={draftGroupId}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDraftGroupId(v);
                    if (draftStudentId && v) {
                      /* limpa aluna se mudar grupo — membro será revalidado ao aplicar */
                    }
                    if (!v) setDraftStudentId("");
                  }}
                >
                  <option value="">Todos os vínculos</option>
                  {groupsForFilter.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g._count.members})
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-ink-800/70">Aluna</span>
                <select
                  className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2 text-sm"
                  value={draftStudentId}
                  onChange={(e) => setDraftStudentId(e.target.value)}
                  disabled={!students.length}
                >
                  <option value="">Todas no recorte</option>
                  {studentOptions.map((row) => (
                    <option key={row.student.id} value={row.student.id}>
                      {row.student.name?.trim() || row.student.email}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="mt-2 text-[11px] text-ink-800/55">
              Com grupo + aluna, a métrica foca nessa aluna dentro do grupo. Só aluna: todas as alunas listadas até você
              escolher uma.
            </p>

            <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-brand-800">Período</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(
                [
                  ["week", "Semana atual"],
                  ["month", "Mês atual"],
                  ["year", "Ano atual"],
                  ["custom", "Datas livres"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    if (id === "custom") {
                      setPreset("custom");
                    } else {
                      setPresetAndDrafts(id);
                    }
                  }}
                  className={clsx(
                    "rounded-xl px-3 py-1.5 text-sm font-medium transition-all duration-200",
                    preset === id
                      ? "bg-brand-500 text-white shadow-md shadow-brand-500/25"
                      : "bg-brand-50 text-ink-800 hover:bg-brand-100",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            {preset === "custom" && (
              <div className="mt-4 flex flex-wrap items-end gap-3">
                <label className="text-sm">
                  <span className="text-ink-800/70">De</span>
                  <input
                    type="date"
                    className="mt-1 block rounded-xl border border-brand-200 px-3 py-2 text-sm"
                    value={fromDraft}
                    onChange={(e) => setFromDraft(e.target.value)}
                  />
                </label>
                <label className="text-sm">
                  <span className="text-ink-800/70">Até</span>
                  <input
                    type="date"
                    className="mt-1 block rounded-xl border border-brand-200 px-3 py-2 text-sm"
                    value={toDraft}
                    onChange={(e) => setToDraft(e.target.value)}
                  />
                </label>
              </div>
            )}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setFilterOpen(false)}>
                Fechar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  const filters = { groupId: draftGroupId, studentId: draftStudentId };
                  if (preset !== "custom") {
                    const map = { week: presetWeek, month: presetMonth, year: presetYear };
                    const r = map[preset]();
                    void load(r.from, r.to, filters);
                    setFilterOpen(false);
                  } else {
                    applyFilterCustomDates();
                  }
                }}
              >
                Aplicar
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {loading && !data && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl bg-gradient-to-br from-brand-100/80 to-orange-50/50"
            />
          ))}
        </div>
      )}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              delay={0}
              label={firstCardLabel}
              value={data.activeStudents}
              hint={firstCardHint}
            />
            <MetricCard
              delay={60}
              label="Treinos concluídos"
              value={data.metrics.workoutsCompleted}
              hint="Registrados no período"
            />
            <MetricCard
              delay={120}
              label="Taxa de engajamento"
              value={`${data.metrics.engagementRate}%`}
              hint={
                data.filter.scope === "student"
                  ? "1 = treinou no período"
                  : "Alunas que treinaram ÷ recorte"
              }
              accent
            />
            <MetricCard
              delay={180}
              label="Sem treino no período"
              value={data.metrics.studentsInactive}
              hint="No recorte, sem conclusão"
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              delay={240}
              label="Minutos de treino"
              value={data.metrics.totalMinutes}
              hint="Soma das durações"
            />
            <MetricCard
              delay={300}
              label="Média / treino"
              value={`${data.metrics.avgMinutesPerWorkout} min`}
              hint="Por sessão concluída"
            />
            <MetricCard
              delay={360}
              label="Média / aluna ativa"
              value={data.metrics.avgWorkoutsPerTrainingStudent}
              hint="Entre quem treinou"
            />
            <MetricCard
              delay={420}
              label="Check-ins (humor)"
              value={data.metrics.checkInsCount}
              hint={`${data.metrics.studentsWithCheckIn} alunas distintas`}
            />
          </div>

          <div
            className="mt-8 animate-fade-in opacity-0"
            style={{ animationDelay: "480ms", animationFillMode: "forwards" }}
          >
            <Card className="relative overflow-hidden border-brand-100/90 shadow-card">
              <p className="pr-36 text-xs font-semibold uppercase tracking-wide text-brand-800 sm:pr-44">
                Treinos concluídos por dia
              </p>
              <p
                className="absolute right-4 top-4 max-w-[11rem] text-right text-[11px] leading-tight text-ink-800/55"
                title="Soma dos treinos concluídos nos dias do período (mesmo critério do gráfico)."
              >
                <span className="font-medium tabular-nums text-ink-800/75">{activityTotalInChart}</span> treinos no
                período
              </p>
              <div className={clsx("mt-4", chartWide && "overflow-x-auto pb-2")}>
                <div
                  className="flex gap-2"
                  style={chartWide ? { minWidth: `${Math.max(data.activityByDay.length * 10, 280)}px` } : undefined}
                >
                  <div
                    className="flex shrink-0 flex-col justify-between pb-6 text-right text-[10px] font-medium tabular-nums text-ink-800/55"
                    style={{ width: 28, height: CHART_INNER_PX + 8 }}
                    aria-hidden
                  >
                    <span>{maxActivity}</span>
                    <span className={maxActivity < 3 ? "invisible select-none" : ""}>
                      {Math.round(maxActivity / 2)}
                    </span>
                    <span>0</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div
                      className="flex items-end gap-px sm:gap-1"
                      style={{ minHeight: CHART_INNER_PX + 8 }}
                      role="img"
                      aria-label={`Gráfico de barras: ${activityTotalInChart} treinos em ${data.activityByDay.length} dias.`}
                    >
                      {data.activityByDay.map((a) => {
                        const barPx =
                          a.count === 0
                            ? 4
                            : Math.max(8, Math.round((a.count / maxActivity) * CHART_INNER_PX));
                        const tooltip = `${formatYmdBrazilLong(a.date)} — ${a.count} ${a.count === 1 ? "treino concluído" : "treinos concluídos"}`;
                        return (
                          <div
                            key={a.date}
                            className="group flex min-w-[7px] flex-1 flex-col justify-end"
                            title={tooltip}
                            style={{ height: CHART_INNER_PX + 8 }}
                          >
                            {showValueOnBar && a.count > 0 && (
                              <span className="mb-0.5 text-center text-[10px] font-semibold tabular-nums text-brand-800 opacity-90">
                                {a.count}
                              </span>
                            )}
                            <div
                              className={clsx(
                                "w-full rounded-t-md shadow-sm transition-all duration-300",
                                a.count === 0
                                  ? "bg-ink-800/10 group-hover:bg-ink-800/15"
                                  : "bg-gradient-to-t from-brand-600 via-brand-500 to-brand-400 opacity-90 shadow-brand-500/10 group-hover:opacity-100",
                              )}
                              style={{ height: barPx, minHeight: 4 }}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div
                      className={clsx(
                        "mt-1 flex justify-between gap-px sm:gap-1",
                        chartWide && "min-w-[280px]",
                      )}
                    >
                      {data.activityByDay.map((a, i) => {
                        const total = data.activityByDay.length;
                        const show = shouldShowDayLabel(i, total);
                        return (
                          <div
                            key={`${a.date}-lbl`}
                            className="min-w-[7px] flex-1 text-center text-[9px] leading-tight text-ink-800/55 sm:text-[10px]"
                          >
                            {show ? formatYmdBrazil(a.date) : "\u00a0"}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {(data.inactiveSample.length > 0 || data.groups.length > 0) && (
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              {data.inactiveSample.length > 0 && (
                <div
                  className="animate-fade-in opacity-0"
                  style={{ animationDelay: "560ms", animationFillMode: "forwards" }}
                >
                  <Card className="h-full border-amber-100/90 bg-gradient-to-br from-amber-50/40 to-white shadow-card">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-900/90">Sem treino no período</p>
                    <p className="mt-1 text-xs text-ink-800/70">
                      {data.filter.scope === "all"
                        ? "Alunas no recorte que não registraram treino concluído neste intervalo."
                        : "No recorte do filtro, quem ainda não registrou treino."}
                    </p>
                    <ul className="mt-3 space-y-2">
                      {data.inactiveSample.map((s) => (
                        <li key={s.id}>
                          <Link
                            href={`/trainer/students/${s.id}`}
                            className="flex items-center justify-between rounded-lg border border-amber-100/80 bg-white/80 px-3 py-2 text-sm font-medium text-ink-900 transition hover:border-brand-200 hover:shadow-sm"
                          >
                            {s.name}
                            <span className="text-xs text-brand-700">Ver →</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </Card>
                </div>
              )}

              <div
                className="animate-fade-in opacity-0"
                style={{ animationDelay: "620ms", animationFillMode: "forwards" }}
              >
                <Card className="h-full shadow-card">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-800">Grupos de treino</p>
                  <p className="mt-1 text-xs text-ink-800/65">Modelos compartilhados com várias alunas</p>
                  <ul className="mt-3 space-y-2">
                    {data.groups.map((g) => (
                      <li key={g.id}>
                        <Link
                          href="/trainer/groups"
                          className="block rounded-lg border border-brand-100 bg-brand-50/50 px-3 py-2.5 transition hover:border-brand-200 hover:bg-brand-50"
                        >
                          <span className="font-medium text-ink-900">{g.name}</span>
                          <span className="mt-0.5 block text-xs text-ink-800/65">
                            {g._count.members} alunas ·{" "}
                            {g.days && g.days.length > 0
                              ? `Rotina ${g.days.length} dias`
                              : (g.template?.name ?? "Grupo")}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {data.groups.length === 0 && (
                    <p className="mt-2 text-sm text-ink-800/65">Nenhum grupo ainda.</p>
                  )}
                </Card>
              </div>
            </div>
          )}

          <div
            className="mt-10 flex flex-wrap gap-3 animate-fade-in opacity-0"
            style={{ animationDelay: "700ms", animationFillMode: "forwards" }}
          >
            <Link href="/trainer/students" className="text-sm font-medium text-brand-800 underline-offset-2 hover:underline">
              Ver alunas
            </Link>
            <span className="text-ink-800/30">·</span>
            <Link href="/trainer/workouts" className="text-sm font-medium text-brand-800 underline-offset-2 hover:underline">
              Modelos de treino
            </Link>
            <span className="text-ink-800/30">·</span>
            <Link href="/trainer/exercises" className="text-sm font-medium text-brand-800 underline-offset-2 hover:underline">
              Banco de exercícios
            </Link>
          </div>
        </>
      )}

      {!loading && !data && (
        <Card>
          <p className="text-sm text-ink-800/80">Não foi possível carregar o painel.</p>
        </Card>
      )}
    </AppShell>
  );
}

function MetricCard({
  label,
  value,
  hint,
  delay,
  accent,
}: {
  label: string;
  value: string | number;
  hint: string;
  delay: number;
  accent?: boolean;
}) {
  return (
    <div
      className="animate-fade-in opacity-0"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "forwards" }}
    >
      <Card
        className={clsx(
          "h-full transition-shadow duration-300 hover:shadow-md",
          accent && "border-brand-200/90 bg-gradient-to-br from-brand-50/90 to-white",
        )}
      >
        <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-800">{label}</p>
        <p className="mt-2 font-display text-3xl font-bold tabular-nums text-ink-900">{value}</p>
        <p className="mt-2 text-xs leading-snug text-ink-800/65">{hint}</p>
      </Card>
    </div>
  );
}

function IconFilter({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
    </svg>
  );
}
