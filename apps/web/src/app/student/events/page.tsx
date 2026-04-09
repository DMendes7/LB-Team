"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { notify } from "@/lib/notify";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui";

type EventRow = {
  id: string;
  name: string;
  prizeNote: string | null;
  startsAt: string;
  endsAt: string;
  status: "upcoming" | "active" | "ended";
  group: { id: string; name: string };
};

function statusPt(s: EventRow["status"]) {
  if (s === "active") return "Em andamento";
  if (s === "upcoming") return "Em breve";
  return "Encerrado";
}

export default function StudentEventsPage() {
  const [rows, setRows] = useState<EventRow[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    api<EventRow[]>("/student/group-events")
      .then(setRows)
      .catch((e) => {
        notify.apiError(e);
        setErr("Não foi possível carregar eventos.");
      });
  }, []);

  return (
    <AppShell role="STUDENT" title="Eventos">
      <p className="mb-4 max-w-xl text-sm text-ink-800/75">
        Eventos dos <strong>grupos</strong> em que você está. Cada treino completo dentro do período conta para o
        ranking.
      </p>
      {err && <p className="mb-3 text-sm text-red-700">{err}</p>}
      {!rows.length && !err && (
        <p className="text-sm text-ink-800/70">Nenhum evento no momento. Sua personal pode criar um para o seu grupo.</p>
      )}
      <ul className="space-y-3">
        {rows.map((e) => (
          <li key={e.id}>
            <Link href={`/student/events/${e.id}`}>
              <Card className="transition hover:border-brand-300 hover:shadow-md">
                <p className="font-display font-semibold text-ink-900">{e.name}</p>
                <p className="mt-1 text-xs text-ink-800/60">
                  {e.group.name} · {statusPt(e.status)}
                </p>
                {e.prizeNote && <p className="mt-2 text-sm text-ink-800/80">{e.prizeNote}</p>}
                <p className="mt-2 text-xs text-ink-800/50">
                  Até {new Date(e.endsAt).toLocaleString("pt-BR")}
                </p>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
