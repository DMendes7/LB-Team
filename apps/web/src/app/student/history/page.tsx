"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui";

export default function HistoryPage() {
  const [rows, setRows] = useState<{ id: string; completedAt: string | null; template: { name: string } | null }[]>([]);

  useEffect(() => {
    api("/student/history/workouts").then(setRows);
  }, []);

  return (
    <AppShell role="STUDENT" title="Histórico de treinos">
      {rows.map((r) => (
        <Card key={r.id} className="mb-3">
          <p className="font-medium">{r.template?.name ?? "Treino"}</p>
          <p className="text-xs text-ink-800/60">{r.completedAt ? new Date(r.completedAt).toLocaleString() : "—"}</p>
        </Card>
      ))}
      {!rows.length && <p className="text-sm text-ink-800/70">Nenhum treino concluído ainda.</p>}
    </AppShell>
  );
}
