"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { notify } from "@/lib/notify";
import { AppShell } from "@/components/AppShell";
import { Button, Card } from "@/components/ui";
import { ConfirmDialog } from "@/components/ConfirmDialog";

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
};

export default function TrainerEventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<Detail | null>(null);
  const [err, setErr] = useState("");
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removing, setRemoving] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    api<Detail>(`/trainer/group-events/${id}`)
      .then(setData)
      .catch((e) => {
        notify.apiError(e);
        setErr("Evento não encontrado.");
      });
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function remove() {
    if (!id) return;
    setRemoving(true);
    try {
      await api(`/trainer/group-events/${id}`, { method: "DELETE" });
      notify.success("Evento excluído.");
      router.push("/trainer/events");
    } catch (e) {
      notify.apiError(e);
      setRemoving(false);
    }
  }

  if (err || !data) {
    return (
      <AppShell role="TRAINER" title="Evento">
        <p className="text-sm text-ink-800/75">{err || "Carregando…"}</p>
        <Link href="/trainer/events" className="mt-4 inline-block text-brand-700">
          Voltar
        </Link>
      </AppShell>
    );
  }

  const { event, leaderboard } = data;

  return (
    <AppShell role="TRAINER" title={event.name}>
      <Link href="/trainer/events" className="mb-4 inline-block text-sm text-brand-700 hover:underline">
        ← Eventos
      </Link>
      <Card className="mb-4">
        <p className="text-xs text-ink-800/60">
          Grupo: <strong>{event.group.name}</strong> ·{" "}
          {event.status === "active" ? "Em andamento" : event.status === "ended" ? "Encerrado" : "Em breve"}
        </p>
        {event.prizeNote && <p className="mt-2 text-sm text-ink-800/85">{event.prizeNote}</p>}
        {event.description && <p className="mt-2 text-sm text-ink-800/75">{event.description}</p>}
        <p className="mt-2 text-xs text-ink-800/55">
          {new Date(event.startsAt).toLocaleString("pt-BR")} → {new Date(event.endsAt).toLocaleString("pt-BR")}
        </p>
        <p className="mt-3 text-xs text-ink-800/60">
          Ranking por <strong>treinos completos</strong> registrados entre início e data limite.
        </p>
        <Button type="button" variant="outline" className="mt-4" onClick={() => setRemoveOpen(true)}>
          Excluir evento
        </Button>
      </Card>

      <Card>
        <h2 className="font-display text-base font-semibold text-ink-900">Ranking</h2>
        <p className="mt-1 text-xs text-ink-800/60">
          {event.status === "ended"
            ? "Classificação final. Prêmios conforme lugares configurados."
            : "Atualiza a cada treino concluído no período."}
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[320px] text-left text-sm">
            <thead>
              <tr className="border-b border-brand-100 text-xs text-ink-800/60">
                <th className="pb-2 pr-2">#</th>
                <th className="pb-2 pr-2">Aluna</th>
                <th className="pb-2 pr-2">Treinos</th>
                <th className="pb-2">Prêmio (lugar)</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((r) => (
                <tr key={r.studentId} className="border-b border-brand-50">
                  <td className="py-2 pr-2 font-medium">{r.rank}</td>
                  <td className="py-2 pr-2">{r.name}</td>
                  <td className="py-2 pr-2 tabular-nums">{r.workoutCount}</td>
                  <td className="py-2 text-ink-800/80">{r.prizeLabel ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!leaderboard.length && <p className="mt-3 text-sm text-ink-800/65">Nenhuma aluna no grupo ainda.</p>}
      </Card>

      <ConfirmDialog
        open={removeOpen}
        title="Excluir evento"
        description="O ranking e premiações deste evento serão apagados. Esta ação não pode ser desfeita."
        confirmLabel={removing ? "Excluindo…" : "Excluir"}
        onConfirm={() => void remove()}
        onCancel={() => setRemoveOpen(false)}
      />
    </AppShell>
  );
}
