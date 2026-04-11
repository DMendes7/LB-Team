"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { api } from "@/lib/api";
import { notify } from "@/lib/notify";
import { AppShell } from "@/components/AppShell";
import { Button, Card } from "@/components/ui";

type SlotRow = {
  id: string;
  label: string;
  sortOrder: number;
  templateId: string;
  templateName: string;
  origin?: "individual" | "group";
};

type Program =
  | { mode: "none" }
  | { mode: "single"; templateId: string; label: string }
  | {
      mode: "slots";
      slots: SlotRow[];
      /** Sugestão do dia conforme a rotina do grupo (Brasília); a aluna pode escolher outro treino. */
      routineHint?: { title: string; templateId: string; templateName: string } | null;
    };

function SlotsSection({ program }: { program: Extract<Program, { mode: "slots" }> }) {
  const sorted = program.slots.slice().sort((a, b) => a.sortOrder - b.sortOrder);
  const hasOrigin = sorted.some((s) => s.origin);
  const individual = hasOrigin ? sorted.filter((s) => s.origin === "individual") : sorted;
  const group = hasOrigin ? sorted.filter((s) => s.origin === "group") : [];
  const split = individual.length > 0 && group.length > 0;

  function renderCards(slots: SlotRow[], globalStart: number) {
    return (
      <ul className="grid gap-4 sm:grid-cols-2">
        {slots.map((s, idx) => {
          const n = globalStart + idx;
          return (
            <li
              key={s.id}
              className="animate-fade-in opacity-0"
              style={{
                animationDelay: `${Math.min(n * 70, 420)}ms`,
                animationFillMode: "forwards",
              }}
            >
              <Link href={`/student/workout/${s.templateId}`} className="group block h-full">
                <Card className="relative h-full overflow-hidden border-brand-100/90 bg-gradient-to-br from-white to-brand-50/40 shadow-card transition duration-300 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg">
                  <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-brand-400/15 blur-2xl transition group-hover:bg-brand-400/25" />
                  <div className="relative flex gap-4">
                    <div
                      className={clsx(
                        "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white shadow-md",
                        n % 3 === 0 && "bg-gradient-to-br from-brand-500 to-orange-500",
                        n % 3 === 1 && "bg-gradient-to-br from-orange-500 to-amber-500",
                        n % 3 === 2 && "bg-gradient-to-br from-amber-500 to-brand-600",
                      )}
                    >
                      {n + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-lg font-bold leading-snug text-ink-900 group-hover:text-brand-800">
                        {s.label}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-ink-800/60">{s.templateName}</p>
                      <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-700">
                        Ver ficha
                        <span className="transition group-hover:translate-x-0.5" aria-hidden>
                          →
                        </span>
                      </p>
                    </div>
                    <div className="hidden shrink-0 text-brand-300 transition group-hover:text-brand-500 sm:block">
                      <DumbbellIcon className="h-10 w-10 opacity-80" />
                    </div>
                  </div>
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-800">
            {split ? "Treinos disponíveis" : individual.length > 0 && !group.length ? "Seu plano" : "Rotina do grupo"}
          </p>
          <p className="mt-1 max-w-xl text-sm text-ink-800/80">
            {split ? (
              <>
                Você tem fichas <strong>só suas</strong> e a <strong>rotina do grupo</strong>. Abra o que fizer sentido
                hoje — tudo conta para streak e nível.
              </>
            ) : group.length > 0 || (!hasOrigin && sorted.length > 0) ? (
              <>
                Cada card reflete a <strong>sugestão da personal</strong> (por dia da semana no grupo). Você pode abrir
                qualquer ficha — a lista inteira fica liberada.
              </>
            ) : (
              <>
                Fichas montadas pela sua personal <strong>só para você</strong>. Toque para ver exercícios e registrar o
                treino.
              </>
            )}
          </p>
        </div>
        <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">
          {sorted.length} fichas
        </span>
      </div>

      {split ? (
        <div className="space-y-8">
          <section>
            <p className="mb-3 text-sm font-semibold text-ink-900">Montadas para você</p>
            {renderCards(individual, 0)}
          </section>
          <section>
            <p className="mb-3 text-sm font-semibold text-ink-900">Grupo(s)</p>
            {renderCards(group, individual.length)}
          </section>
        </div>
      ) : (
        renderCards(sorted, 0)
      )}
    </>
  );
}

function DumbbellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 10V14M18 10V14M4 12H2M22 12H20M6 12C6 10.8954 6.89543 10 8 10H16C17.1046 10 18 10.8954 18 12C18 13.1046 17.1046 14 16 14H8C6.89543 14 6 13.1046 6 12Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path d="M8 10V8C8 6.89543 8.89543 6 10 6H14C15.1046 6 16 6.89543 16 8V10" stroke="currentColor" strokeWidth="1.75" />
      <path d="M8 14V16C8 17.1046 8.89543 18 10 18H14C15.1046 18 16 17.1046 16 16V14" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

export default function StudentWorkoutProgramPage() {
  const [program, setProgram] = useState<Program | null>(null);

  useEffect(() => {
    api<Program>("/student/workout-program")
      .then(setProgram)
      .catch((e) => {
        notify.apiError(e);
        setProgram({ mode: "none" });
      });
  }, []);

  return (
    <AppShell role="STUDENT" title="Meus treinos">
      {!program && <p className="text-sm text-ink-800/75">Carregando…</p>}

      {program?.mode === "slots" && program.routineHint && (
        <Card className="mb-5 border-brand-200/90 bg-gradient-to-r from-brand-50/95 to-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-800">Sugestão de hoje</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-900/90">{program.routineHint.title}</p>
        </Card>
      )}

      {program?.mode === "none" && (
        <Card className="border-dashed border-brand-200/80 bg-gradient-to-br from-brand-50/80 to-white">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-800">Plano em espera</p>
              <p className="mt-2 max-w-md text-sm text-ink-800/85">
                Nenhum plano vinculado ainda. Sua personal pode colocar você em um <strong>grupo de treino</strong> ou
                montar <strong>várias fichas</strong> só para você.
              </p>
            </div>
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-100/80 text-brand-600">
              <DumbbellIcon className="h-9 w-9 opacity-90" />
            </div>
          </div>
        </Card>
      )}

      {program?.mode === "single" && (
        <div
          className="animate-fade-in overflow-hidden rounded-3xl border border-brand-200/90 bg-gradient-to-br from-brand-500 via-brand-600 to-orange-700 p-[1px] shadow-glow"
          style={{ animationFillMode: "forwards" }}
        >
          <div className="rounded-[22px] bg-gradient-to-br from-white/95 to-brand-50/90 p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-orange-600 text-white shadow-lg shadow-brand-500/30">
                  <DumbbellIcon className="h-9 w-9" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-brand-800/90">Sua ficha principal</p>
                  <p className="font-display mt-1 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
                    {program.label}
                  </p>
                  <p className="mt-2 text-sm text-ink-800/70">Treino completo com exercícios, séries e vídeos.</p>
                </div>
              </div>
              <Link href={`/student/workout/${program.templateId}`} className="shrink-0">
                <Button className="w-full min-w-[200px] gap-2 shadow-lg shadow-brand-600/25 sm:w-auto">
                  <span>Abrir treino</span>
                  <span aria-hidden>→</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {program?.mode === "slots" && program.slots.length > 0 && (
        <SlotsSection program={program} />
      )}
    </AppShell>
  );
}
