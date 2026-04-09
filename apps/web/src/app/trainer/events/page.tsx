"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { notify } from "@/lib/notify";
import { AppShell } from "@/components/AppShell";
import { Button, Card } from "@/components/ui";

type EventRow = {
  id: string;
  name: string;
  prizeNote: string | null;
  startsAt: string;
  endsAt: string;
  status: "upcoming" | "active" | "ended";
  group: { id: string; name: string };
  prizeTiers: { place: number; prizeLabel: string }[];
};

function statusPt(s: EventRow["status"]) {
  if (s === "active") return "Em andamento";
  if (s === "upcoming") return "Em breve";
  return "Encerrado";
}

export default function TrainerEventsPage() {
  const [rows, setRows] = useState<EventRow[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    api<EventRow[]>("/trainer/group-events")
      .then(setRows)
      .catch((e) => {
        notify.apiError(e);
        setErr("Não foi possível carregar eventos.");
      });
  }, []);

  return (
    <AppShell role="TRAINER" title="Eventos">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-ink-800/75">
          Eventos ficam ligados a um <strong>grupo</strong>. Só quem está no grupo vê e entra no ranking por{" "}
          <strong>treinos completos</strong> no período.
        </p>
        <Link href="/trainer/events/new">
          <Button>Novo evento</Button>
        </Link>
      </div>
      {err && <p className="mb-3 text-sm text-red-700">{err}</p>}
      {!rows.length && !err && <p className="text-sm text-ink-800/70">Nenhum evento ainda.</p>}
      <ul className="space-y-3">
        {rows.map((e) => (
          <li key={e.id}>
            <Link href={`/trainer/events/${e.id}`}>
              <Card className="transition hover:border-brand-300 hover:shadow-md">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-display font-semibold text-ink-900">{e.name}</p>
                    <p className="mt-1 text-xs text-ink-800/60">
                      Grupo: {e.group.name} · {statusPt(e.status)}
                    </p>
                    <p className="mt-1 text-xs text-ink-800/55">
                      {new Date(e.startsAt).toLocaleString("pt-BR")} →{" "}
                      {new Date(e.endsAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <span
                    className={
                      e.status === "active"
                        ? "rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-800"
                        : e.status === "ended"
                          ? "rounded-full bg-ink-100 px-2 py-0.5 text-xs text-ink-700"
                          : "rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-900"
                    }
                  >
                    {statusPt(e.status)}
                  </span>
                </div>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
