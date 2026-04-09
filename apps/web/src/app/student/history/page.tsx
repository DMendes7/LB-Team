"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { notify } from "@/lib/notify";
import { formatWeightsRecorded } from "@/lib/workout-weights";
import { AppShell } from "@/components/AppShell";
import { Button, Card } from "@/components/ui";

type SessionSummary = {
  id: string;
  completedAt: string;
  durationSeconds: number | null;
  templateName: string;
  templateId: string | null;
};

type CalendarRes = { year: number; month: number; sessions: SessionSummary[] };

type ExerciseRow = {
  orderIndex: number;
  skipped: boolean;
  completedAt: string | null;
  weightKg: number | null;
  weightsSeries?: unknown;
  exercise: { id: string; name: string };
};

type CompletionDetail = {
  id: string;
  completedAt: string | null;
  startedAt: string;
  durationSeconds: number | null;
  dayFeeling: string | null;
  notes: string | null;
  template: { name: string } | null;
  exerciseCompletions: ExerciseRow[];
};

function monthKey(d: Date) {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

function formatDur(s: number | null) {
  if (s == null) return "—";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}min`;
  if (m > 0) return `${m} min ${sec}s`;
  return `${sec}s`;
}

export default function HistoryPage() {
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [cal, setCal] = useState<CalendarRes | null>(null);
  const [recent, setRecent] = useState<
    { id: string; completedAt: string | null; durationSeconds: number | null; template: { name: string } | null }[]
  >([]);
  const [dayModal, setDayModal] = useState<string | null>(null);
  const [detail, setDetail] = useState<CompletionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(() => {
    api<CalendarRes>(`/student/workout-calendar?month=${month}`)
      .then(setCal)
      .catch((e) => notify.apiError(e));
    api<
      { id: string; completedAt: string | null; durationSeconds: number | null; template: { name: string } | null }[]
    >("/student/history/workouts")
      .then(setRecent)
      .catch((e) => notify.apiError(e));
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const sessionsOnDay = dayModal && cal ? cal.sessions.filter((s) => s.completedAt.slice(0, 10) === dayModal) : [];

  const calendar = useMemo(() => {
    if (!cal) return { cells: [] as { key: string; inMonth: boolean; trained: boolean; isToday: boolean }[], label: "" };
    const { year, month: m } = cal;
    const first = new Date(Date.UTC(year, m - 1, 1));
    const last = new Date(Date.UTC(year, m, 0));
    const startPad = first.getUTCDay();
    const daysInMonth = last.getUTCDate();
    const trained = new Set(cal.sessions.map((s) => s.completedAt.slice(0, 10)));
    const now = new Date();
    const todayKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
    const cells: { key: string; inMonth: boolean; trained: boolean; isToday: boolean }[] = [];
    for (let i = 0; i < startPad; i++) cells.push({ key: `p-${i}`, inMonth: false, trained: false, isToday: false });
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ key, inMonth: true, trained: trained.has(key), isToday: key === todayKey });
    }
    const label = new Date(Date.UTC(year, m - 1, 1)).toLocaleString("pt-BR", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
    return { cells, label };
  }, [cal]);

  function shiftMonth(delta: number) {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    setMonth(monthKey(d));
  }

  async function openDetail(id: string) {
    setDetailLoading(true);
    setDetail(null);
    try {
      const d = await api<CompletionDetail>(`/student/history/workouts/${id}`);
      setDetail(d);
    } catch (e) {
      notify.apiError(e);
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <AppShell role="STUDENT" title="Histórico de treinos">
      <Card className="mb-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-base font-semibold text-ink-900">Calendário (UTC)</h2>
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
                  if (c.trained) setDayModal(c.key);
                }}
                className={`rounded-lg py-2 transition-colors ${
                  c.trained
                    ? "cursor-pointer bg-brand-500 font-semibold text-white hover:bg-brand-600"
                    : "bg-brand-50/80 text-ink-800"
                } ${
                  c.isToday
                    ? c.trained
                      ? "ring-2 ring-white/90 ring-offset-2 ring-offset-brand-500"
                      : "ring-2 ring-brand-600 ring-offset-2 ring-offset-white"
                    : ""
                } ${!c.trained ? "cursor-default" : ""}`}
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
        <p className="mt-2 text-xs text-ink-800/60">Toque num dia em destaque para ver o registro do treino.</p>
      </Card>

      <h2 className="mb-2 font-display text-base font-semibold text-ink-900">Últimos treinos</h2>
      {recent.map((r) => (
        <Card key={r.id} className="mb-3">
          <button type="button" className="w-full text-left" onClick={() => void openDetail(r.id)}>
            <p className="font-medium text-ink-900">{r.template?.name ?? "Treino"}</p>
            <p className="text-xs text-ink-800/60">
              {r.completedAt ? new Date(r.completedAt).toLocaleString("pt-BR") : "—"} · Duração:{" "}
              {formatDur(r.durationSeconds)}
            </p>
            <p className="mt-1 text-xs font-medium text-brand-700">Ver detalhe →</p>
          </button>
        </Card>
      ))}
      {!recent.length && <p className="text-sm text-ink-800/70">Nenhum treino registrado ainda.</p>}

      {dayModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-3 sm:items-center"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => e.target === e.currentTarget && setDayModal(null)}
        >
          <Card className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl p-4 shadow-xl">
            <p className="font-display font-bold text-ink-900">Treinos em {dayModal}</p>
            <ul className="mt-3 space-y-2">
              {sessionsOnDay.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className="w-full rounded-xl border border-brand-100 bg-brand-50/50 px-3 py-3 text-left hover:bg-brand-50"
                    onClick={() => {
                      setDayModal(null);
                      void openDetail(s.id);
                    }}
                  >
                    <p className="font-medium text-ink-900">{s.templateName}</p>
                    <p className="text-xs text-ink-800/65">
                      {new Date(s.completedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} ·{" "}
                      {formatDur(s.durationSeconds)}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
            <Button type="button" variant="ghost" className="mt-4 w-full" onClick={() => setDayModal(null)}>
              Fechar
            </Button>
          </Card>
        </div>
      )}

      {(detail || detailLoading) && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-ink-900/40 p-3 sm:items-center"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => e.target === e.currentTarget && setDetail(null)}
        >
          <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl p-4 shadow-xl">
            {detailLoading && <p className="text-sm text-ink-800/70">Carregando…</p>}
            {detail && !detailLoading && (
              <>
                <p className="font-display font-bold text-ink-900">{detail.template?.name ?? "Treino"}</p>
                <p className="mt-1 text-xs text-ink-800/65">
                  {detail.completedAt ? new Date(detail.completedAt).toLocaleString("pt-BR") : "—"}
                </p>
                <p className="mt-2 text-sm text-ink-800">
                  <strong>Duração:</strong> {formatDur(detail.durationSeconds)}
                </p>
                {detail.dayFeeling && (
                  <p className="mt-1 text-sm text-ink-800">
                    <strong>Esforço:</strong> {detail.dayFeeling}
                  </p>
                )}
                {detail.notes && (
                  <p className="mt-2 rounded-lg bg-brand-50/80 p-2 text-sm text-ink-800">
                    <strong>Nota:</strong> {detail.notes}
                  </p>
                )}
                <p className="mt-4 text-xs font-semibold uppercase text-brand-800">Exercícios</p>
                <ul className="mt-2 space-y-2">
                  {detail.exerciseCompletions.map((e) => {
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
                <Button type="button" variant="ghost" className="mt-4 w-full" onClick={() => setDetail(null)}>
                  Fechar
                </Button>
              </>
            )}
          </Card>
        </div>
      )}
    </AppShell>
  );
}
