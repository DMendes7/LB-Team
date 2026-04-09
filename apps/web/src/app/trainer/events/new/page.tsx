"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { notify } from "@/lib/notify";
import { AppShell } from "@/components/AppShell";
import { Button, Card } from "@/components/ui";

type GroupOpt = { id: string; name: string };

type Tier = { place: number; prizeLabel: string };

function resizeTiers(count: number, prev: Tier[]): Tier[] {
  const n = Math.min(30, Math.max(1, Math.floor(count)));
  return Array.from({ length: n }, (_, i) => ({
    place: i + 1,
    prizeLabel: prev[i]?.prizeLabel ?? "",
  }));
}

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function TrainerNewEventPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<GroupOpt[]>([]);
  const [groupId, setGroupId] = useState("");
  const [name, setName] = useState("");
  const [prizeNote, setPrizeNote] = useState("");
  const [description, setDescription] = useState("");
  const [startsLocal, setStartsLocal] = useState("");
  const [endsLocal, setEndsLocal] = useState("");
  const [winnerCount, setWinnerCount] = useState(1);
  const [tiers, setTiers] = useState<Tier[]>(() => resizeTiers(1, []));
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<{ id: string; name: string }[]>("/trainer/workout-groups")
      .then((g) => {
        setGroups(g);
        if (g[0]) setGroupId(g[0].id);
      })
      .catch((e) => {
        notify.apiError(e);
        setErr("Carregue os grupos (ou crie um grupo antes).");
      });
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + 14);
    setStartsLocal(toLocalInput(now));
    setEndsLocal(toLocalInput(end));
  }, []);

  async function submit() {
    setErr("");
    if (!groupId) {
      notify.warning("Escolha um grupo.");
      setErr("Escolha um grupo.");
      return;
    }
    if (!name.trim()) {
      notify.warning("Nome do evento é obrigatório.");
      setErr("Nome do evento é obrigatório.");
      return;
    }
    if (tiers.some((t) => !t.prizeLabel.trim())) {
      notify.warning(`Preencha o prêmio de cada um dos ${tiers.length} lugar(es).`);
      setErr(`Preencha o prêmio de cada um dos ${tiers.length} lugar(es).`);
      return;
    }
    setSaving(true);
    try {
      const body = {
        groupId,
        name: name.trim(),
        description: description.trim() || null,
        prizeNote: prizeNote.trim() || null,
        startsAt: new Date(startsLocal).toISOString(),
        endsAt: new Date(endsLocal).toISOString(),
        prizeTiers: tiers.map((t) => ({ place: t.place, prizeLabel: t.prizeLabel.trim() })),
      };
      const created = await api<{ id: string }>("/trainer/group-events", {
        method: "POST",
        body: JSON.stringify(body),
      });
      notify.success("Evento criado.");
      router.push(`/trainer/events/${created.id}`);
    } catch (e) {
      notify.apiError(e);
      setErr(e instanceof Error ? e.message : "Erro ao criar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell role="TRAINER" title="Novo evento">
      <Link href="/trainer/events" className="mb-4 inline-block text-sm text-brand-700 hover:underline">
        ← Eventos
      </Link>
      <Card>
        {groups.length === 0 ? (
          <p className="text-sm text-ink-800/75">
            Crie um grupo em <Link href="/trainer/groups" className="text-brand-700 underline">Grupos</Link> antes.
          </p>
        ) : (
          <div className="space-y-4">
            <label className="block text-sm">
              <span className="text-ink-800/80">Grupo</span>
              <select
                className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2 text-sm"
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-ink-800/80">Nome do evento</span>
              <input
                className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Desafio abril"
              />
            </label>
            <label className="block text-sm">
              <span className="text-ink-800/80">Prêmio / tema (opcional)</span>
              <input
                className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2 text-sm"
                value={prizeNote}
                onChange={(e) => setPrizeNote(e.target.value)}
                placeholder="Ex.: Premiação em dinheiro"
              />
            </label>
            <label className="block text-sm">
              <span className="text-ink-800/80">Descrição (opcional)</span>
              <textarea
                className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2 text-sm"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-ink-800/80">Início</span>
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2 text-sm"
                  value={startsLocal}
                  onChange={(e) => setStartsLocal(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                <span className="text-ink-800/80">Data limite</span>
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2 text-sm"
                  value={endsLocal}
                  onChange={(e) => setEndsLocal(e.target.value)}
                />
              </label>
            </div>
            <div>
              <label className="block text-sm">
                <span className="text-ink-800/80">Número de ganhadores (lugares premiados)</span>
                <select
                  className="mt-1 w-full max-w-xs rounded-xl border border-brand-200 px-3 py-2 text-sm"
                  value={winnerCount}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    setWinnerCount(n);
                    setTiers((prev) => resizeTiers(n, prev));
                  }}
                >
                  {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? "ganhador" : "ganhadores"}
                    </option>
                  ))}
                </select>
              </label>
              <p className="mt-2 text-sm font-medium text-ink-900">Prêmio por lugar</p>
              <p className="mt-1 text-xs text-ink-800/60">
                Métrica do ranking: <strong>treinos completos</strong> no período. O 1.º lugar do ranking recebe o
                prêmio do 1.º campo, e assim por diante.
              </p>
              <ul className="mt-3 space-y-2">
                {tiers.map((t, i) => (
                  <li key={t.place} className="flex flex-wrap items-center gap-2">
                    <span className="w-16 shrink-0 text-sm font-medium text-ink-800/80">{t.place}.º lugar</span>
                    <input
                      className="min-w-[12rem] flex-1 rounded-xl border border-brand-200 px-3 py-2 text-sm"
                      placeholder={t.place === 1 ? "Ex.: R$ 1.000" : `Prêmio do ${t.place}.º lugar`}
                      value={t.prizeLabel}
                      onChange={(e) => {
                        const copy = [...tiers];
                        copy[i] = { ...copy[i], prizeLabel: e.target.value };
                        setTiers(copy);
                      }}
                    />
                  </li>
                ))}
              </ul>
            </div>
            {err && <p className="text-sm text-red-700">{err}</p>}
            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={saving} onClick={() => void submit()}>
                {saving ? "Salvando…" : "Criar evento"}
              </Button>
              <Link href="/trainer/events">
                <Button type="button" variant="ghost">
                  Cancelar
                </Button>
              </Link>
            </div>
          </div>
        )}
      </Card>
    </AppShell>
  );
}
