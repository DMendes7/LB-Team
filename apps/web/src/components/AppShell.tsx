"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import type { ReactNode } from "react";
import { Button } from "./ui";
import { setToken } from "@/lib/api";
import { useStudentEventsBadge } from "@/hooks/useStudentEventsBadge";

type Role = "STUDENT" | "TRAINER" | "NUTRITIONIST" | "ADMIN";

const nav: Record<Role, { href: string; label: string }[]> = {
  STUDENT: [
    { href: "/student/dashboard", label: "Início" },
    { href: "/student/workout", label: "Treino" },
    { href: "/student/nutrition", label: "Nutrição" },
    { href: "/student/progress", label: "Progresso" },
    { href: "/student/events", label: "Eventos" },
    { href: "/student/history", label: "Histórico" },
    { href: "/student/messages", label: "Apoio" },
    { href: "/student/profile", label: "Perfil" },
  ],
  TRAINER: [
    { href: "/trainer/dashboard", label: "Painel" },
    { href: "/trainer/students", label: "Alunas" },
    { href: "/trainer/exercises", label: "Exercícios" },
    { href: "/trainer/workouts", label: "Treinos" },
    { href: "/trainer/groups", label: "Grupos" },
    { href: "/trainer/events", label: "Eventos" },
  ],
  NUTRITIONIST: [
    { href: "/nutritionist/dashboard", label: "Painel" },
    { href: "/nutritionist/patients", label: "Pacientes" },
    { href: "/nutritionist/plans", label: "Planos" },
    { href: "/nutritionist/groups", label: "Grupos" },
    { href: "/nutritionist/reports", label: "Relatórios" },
  ],
  ADMIN: [
    { href: "/admin/dashboard", label: "Painel" },
    { href: "/admin/users", label: "Usuários" },
    { href: "/admin/links", label: "Vínculos" },
    { href: "/admin/settings", label: "Config" },
  ],
};

/** Estilo “gravando”: bolinha vermelha + anel que pulsa (animate-ping). */
function EventsTabIndicator({ kind }: { kind: "live" | "ended" }) {
  if (kind === "live") {
    return (
      <span className="relative flex h-2.5 w-2.5 shrink-0 items-center justify-center" title="Evento ativo agora" aria-hidden>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500 ring-1 ring-white" />
      </span>
    );
  }
  return (
    <span
      className="h-2 w-2 shrink-0 rounded-full bg-amber-500 ring-2 ring-amber-200"
      title="Evento encerrado — toque para ver"
      aria-hidden
    />
  );
}

export function AppShell({ role, title, children }: { role: Role; title?: string; children: ReactNode }) {
  const path = usePathname();
  const items = nav[role];
  const eventsBadge = useStudentEventsBadge(role === "STUDENT");

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-orange-50/40">
      <header className="sticky top-0 z-40 border-b border-brand-100/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="font-display text-lg font-semibold text-brand-700">
            LB Team
          </Link>
          <nav className="hidden flex-wrap justify-end gap-1 md:flex">
            {items.map((item) => {
              const active = path === item.href || path.startsWith(item.href + "/");
              const showEventsDot = item.href === "/student/events" && eventsBadge;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    active ? "bg-brand-100 text-brand-900" : "text-ink-800 hover:bg-brand-50",
                  )}
                >
                  {showEventsDot ? (
                    <span className="relative inline-block">
                      {item.label}
                      <span className="pointer-events-none absolute right-0 top-0 z-10 translate-x-[42%] -translate-y-[38%]">
                        <EventsTabIndicator kind={eventsBadge} />
                      </span>
                    </span>
                  ) : (
                    item.label
                  )}
                </Link>
              );
            })}
          </nav>
          <Button
            variant="ghost"
            className="text-xs"
            type="button"
            onClick={() => {
              setToken(null);
              window.location.href = "/login";
            }}
          >
            Sair
          </Button>
        </div>
      </header>
      {title && (
        <div className="mx-auto max-w-6xl px-4 pt-8">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900 md:text-3xl">{title}</h1>
        </div>
      )}
      <main className="mx-auto max-w-6xl px-4 py-6 pb-24">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-brand-100 bg-white/95 px-2 py-2 backdrop-blur md:hidden">
        <div className="flex justify-around">
          {items.slice(0, 5).map((item) => {
            const active = path === item.href || path.startsWith(item.href + "/");
            const showEventsDot = item.href === "/student/events" && eventsBadge;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex flex-1 items-center justify-center rounded-lg py-2 text-center text-[11px] font-medium leading-tight",
                  active ? "text-brand-700" : "text-ink-800/70",
                )}
              >
                {showEventsDot ? (
                  <span className="relative inline-block max-w-full px-0.5">
                    {item.label}
                    <span className="pointer-events-none absolute right-0 top-0 z-10 translate-x-[35%] -translate-y-[30%]">
                      <EventsTabIndicator kind={eventsBadge} />
                    </span>
                  </span>
                ) : (
                  item.label
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
