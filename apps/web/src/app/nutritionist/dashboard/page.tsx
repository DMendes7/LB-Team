"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui";

export default function NutritionistDashboardPage() {
  const [d, setD] = useState<{ patients: number; groups: unknown[]; lowAdhesionHint: number } | null>(null);

  useEffect(() => {
    api("/nutritionist/dashboard").then(setD).catch(() => setD(null));
  }, []);

  if (!d) return <p className="p-8 text-center">Acesso restrito à nutricionista.</p>;

  return (
    <AppShell role="NUTRITIONIST" title="Painel nutricional">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <p className="text-xs uppercase text-brand-800">Pacientes</p>
          <p className="font-display text-3xl font-bold">{d.patients}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-brand-800">Grupos nutricionais</p>
          <p className="font-display text-3xl font-bold">{d.groups.length}</p>
        </Card>
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/nutritionist/patients" className="text-sm font-semibold text-brand-700">
          Ver pacientes
        </Link>
        <Link href="/nutritionist/plans" className="text-sm font-semibold text-brand-700">
          Planos
        </Link>
        <Link href="/nutritionist/groups" className="text-sm font-semibold text-brand-700">
          Grupos
        </Link>
      </div>
    </AppShell>
  );
}
