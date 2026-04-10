"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { notify } from "@/lib/notify";
import { AppShell } from "@/components/AppShell";
import { EventPodium } from "@/components/EventPodium";
import { Card } from "@/components/ui";

type LeaderRow = {
  rank: number;
  studentId: string;
  name: string;
  workoutCount: number;
  prizeLabel: string | null;
};

type Detail = {
  event: {
    id: string;
    name: string;
    description: string | null;
    prizeNote: string | null;
    startsAt: string;
    endsAt: string;
    status: "upcoming" | "active" | "ended";
    group: { id: string; name: string };
    prizeTiers: { place: number; prizeLabel: string }[];
  };
  leaderboard: LeaderRow[];
  my: LeaderRow | null;
};

export default function StudentEventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Detail | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(() => {
    if (!id) return;
    api<Detail>(`/student/group-events/${id}`)
      .then(setData)
      .catch((e) => {
        notify.apiError(e);
        setErr("Não foi possível abrir este evento.");
      });
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (err || !data) {
    return (
      <AppShell role="STUDENT" title="Evento">
        <p className="text-sm text-ink-800/75">{err || "Carregando…"}</p>
        <Link href="/student/events" className="mt-4 inline-block text-brand-700">
          Voltar
        </Link>
      </AppShell>
    );
  }

  const { event, leaderboard, my } = data;

  return (
    <AppShell role="STUDENT" title={event.name}>
      <Link href="/student/events" className="mb-4 inline-block text-sm text-brand-700 hover:underline">
        ← Eventos
      </Link>
      <Card className="mb-4">
        <p className="text-xs text-ink-800/60">Grupo: {event.group.name}</p>
        {event.prizeNote && <p className="mt-2 text-sm text-ink-800/85">{event.prizeNote}</p>}
        {event.description && <p className="mt-2 text-sm text-ink-800/75">{event.description}</p>}
        <p className="mt-2 text-xs text-ink-800/55">
          {new Date(event.startsAt).toLocaleString("pt-BR")} → {new Date(event.endsAt).toLocaleString("pt-BR")}
        </p>
        {my && (
          <p className="mt-4 rounded-lg bg-brand-50/90 px-3 py-2 text-sm text-ink-900">
            Sua posição: <strong>{my.rank}.º</strong> · <strong>{my.workoutCount}</strong> treinos
            {my.prizeLabel ? (
              <>
                {" "}
                · Prêmio do lugar: <strong>{my.prizeLabel}</strong>
              </>
            ) : null}
          </p>
        )}
      </Card>

      {event.status === "ended" ? (
        <Card className="overflow-hidden border-brand-200/80 bg-gradient-to-b from-white to-brand-50/30">
          <p className="text-center font-display text-xs font-semibold uppercase tracking-wide text-brand-800">
            Classificação final
          </p>
          <div role="region" aria-label="Pódio da classificação final" className="mt-4">
            <EventPodium
              leaderboard={leaderboard}
              prizeTiers={event.prizeTiers}
              highlightStudentId={my?.studentId ?? null}
            />
          </div>
        </Card>
      ) : (
        <Card>
          <h2 className="font-display text-base font-semibold text-ink-900">Ranking</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[280px] text-left text-sm">
              <thead>
                <tr className="border-b border-brand-100 text-xs text-ink-800/60">
                  <th className="pb-2 pr-2">#</th>
                  <th className="pb-2 pr-2">Aluna</th>
                  <th className="pb-2 pr-2">Treinos</th>
                  <th className="pb-2">Prêmio</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((r) => (
                  <tr
                    key={r.studentId}
                    className={
                      my?.studentId === r.studentId
                        ? "border-b border-brand-50 bg-brand-50/40"
                        : "border-b border-brand-50"
                    }
                  >
                    <td className="py-2 pr-2 font-medium">{r.rank}</td>
                    <td className="py-2 pr-2">
                      {r.name}
                      {my?.studentId === r.studentId ? (
                        <span className="ml-1 text-xs font-medium text-brand-700">(você)</span>
                      ) : null}
                    </td>
                    <td className="py-2 pr-2 tabular-nums">{r.workoutCount}</td>
                    <td className="py-2 text-ink-800/80">{r.prizeLabel ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </AppShell>
  );
}
