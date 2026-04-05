"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui";

export default function TrainerDashboardPage() {
  const [d, setD] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    api("/trainer/dashboard").then(setD).catch(() => setD(null));
  }, []);

  if (!d) return <p className="p-8 text-center">Acesso restrito ao personal.</p>;

  const activeStudents = d.activeStudents as number;
  const groups = d.groups as { id: string; name: string; _count: { members: number }; template: { name: string } }[];

  return (
    <AppShell role="TRAINER" title="Painel da personal">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-xs uppercase text-brand-800">Alunas ativas</p>
          <p className="font-display text-3xl font-bold">{activeStudents}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-brand-800">Grupos de treino</p>
          <p className="font-display text-3xl font-bold">{groups?.length ?? 0}</p>
        </Card>
        <Card>
          <p className="text-xs text-ink-800/70">Ações rápidas</p>
          <div className="mt-3 flex flex-col gap-2">
            <Link href="/trainer/exercises" className="text-sm font-medium text-brand-700">
              Banco de exercícios
            </Link>
            <Link href="/trainer/workouts" className="text-sm font-medium text-brand-700">
              Modelos de treino
            </Link>
            <Link href="/trainer/groups" className="text-sm font-medium text-brand-700">
              Grupos
            </Link>
          </div>
        </Card>
      </div>
      <h2 className="mt-10 font-display text-lg font-semibold">Grupos</h2>
      <div className="mt-4 space-y-3">
        {groups?.map((g) => (
          <Card key={g.id}>
            <p className="font-medium">{g.name}</p>
            <p className="text-sm text-ink-800/70">
              {g._count.members} alunas · modelo: {g.template.name}
            </p>
          </Card>
        ))}
      </div>
      <h2 className="mt-10 font-display text-lg font-semibold">Sinais de atenção (resumo)</h2>
      <p className="mt-2 text-sm text-ink-800/75">
        Listas de baixa frequência, streak em risco e quem bateu a meta vêm da API — use para priorizar mensagens
        humanas.
      </p>
    </AppShell>
  );
}
