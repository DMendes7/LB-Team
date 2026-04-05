"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui";

type Program =
  | { mode: "none" }
  | { mode: "single"; templateId: string; label: string }
  | {
      mode: "slots";
      slots: { id: string; label: string; sortOrder: number; templateId: string; templateName: string }[];
    };

export default function StudentWorkoutProgramPage() {
  const [program, setProgram] = useState<Program | null>(null);

  useEffect(() => {
    api<Program>("/student/workout-program").then(setProgram).catch(() => setProgram({ mode: "none" }));
  }, []);

  return (
    <AppShell role="STUDENT" title="Meus treinos">
      {!program && <p className="text-sm text-ink-800/75">Carregando…</p>}

      {program?.mode === "none" && (
        <Card>
          <p className="text-sm text-ink-800/85">
            Nenhum plano vinculado ainda. Sua personal pode colocar você em um <strong>grupo de treino</strong> ou
            montar <strong>várias fichas</strong> só para você.
          </p>
        </Card>
      )}

      {program?.mode === "single" && (
        <Card className="mb-3">
          <p className="text-xs text-ink-800/65">Seu plano atual</p>
          <p className="mt-1 font-semibold text-ink-900">{program.label}</p>
          <Link
            href={`/student/workout/${program.templateId}`}
            className="mt-4 inline-flex rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-md"
          >
            Abrir ficha
          </Link>
        </Card>
      )}

      {program?.mode === "slots" && program.slots.length > 0 && (
        <>
          <p className="mb-3 text-sm text-ink-800/80">
            Toque em um treino para ver a ficha de hoje e os exercícios. Cada um é uma ficha separada (ex.: peito,
            costas, perna).
          </p>
          <ul className="space-y-2">
            {program.slots.map((s) => (
              <li key={s.id}>
                <Link href={`/student/workout/${s.templateId}`}>
                  <Card className="transition hover:border-brand-300 hover:shadow-md">
                    <p className="font-semibold text-ink-900">{s.label}</p>
                    <p className="mt-0.5 text-xs text-ink-800/60">{s.templateName}</p>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </AppShell>
  );
}
