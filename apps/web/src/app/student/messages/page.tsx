"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui";

const POOL = [
  "Hoje é um ótimo dia para dar um passo a mais do que ontem.",
  "Constância transforma hábito — e hábito transforma resultado.",
  "Seu corpo agradece cada escolha que você faz por ele.",
  "Pequenos progressos somam grandes vitórias.",
  "Você não precisa ser perfeita — só precisa continuar.",
  "Respira, foca e vai: você já provou que consegue.",
  "A disciplina é o que resta quando a motivação vai embora — e você tem as duas.",
  "Cada treino é um voto na versão de você que quer chegar lá.",
  "Lembre: comparar seu capítulo 1 com o capítulo 10 de outra pessoa não é justo com você.",
  "Energia boa atrai energia boa — comece pelo movimento.",
  "O cansaço passa; a satisfação de ter treinado fica.",
  "Seu futuro eu vai agradecer o que você faz hoje.",
  "Não existe treino perdido: existe só o que você aprendeu no caminho.",
  "Meta do dia: ser 1% melhor que ontem.",
  "Você é mais forte do que pensa — literalmente e figurativamente.",
  "Recomeçar não é falhar; é coragem.",
  "Hidrata, alonga e conquista — o básico bem feito vence.",
  "O espelho mostra esforço antes de mostrar resultado — confie no processo.",
  "LB Team está torcendo por você — literalmente, no app.",
  "Um passo de cada vez. O ranking é você contra a versão de ontem.",
];

export default function MessagesPage() {
  /** Só definido no cliente após montar — evita hydration mismatch (random ≠ SSR). */
  const [line, setLine] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const i = Math.floor(Math.random() * POOL.length);
    setLine(POOL[i] ?? POOL[0]);
    setMounted(true);
  }, []);

  return (
    <AppShell role="STUDENT" title="Apoio">
      <div className="mx-auto max-w-lg">
        <p className="mb-6 text-center text-sm text-ink-800/70">
          Um momento para recarregar — mensagens pensadas para acompanhar sua jornada no LB Team.
        </p>
        <Card
          className={clsx(
            "relative overflow-hidden border-brand-200/80 bg-gradient-to-b from-white via-brand-50/30 to-orange-50/40 shadow-card transition-all duration-500",
            mounted ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
          )}
        >
          <div className="pointer-events-none absolute -left-10 top-0 h-40 w-40 rounded-full bg-brand-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 right-0 h-36 w-36 rounded-full bg-orange-400/15 blur-3xl" />
          <div className="relative px-6 py-10 text-center sm:px-10 sm:py-12">
            <p
              className={clsx(
                "min-h-[5.5rem] font-display text-xl font-semibold leading-relaxed text-ink-900 transition-all duration-700 sm:min-h-[6rem] sm:text-2xl",
                mounted ? "scale-100" : "scale-[0.98]",
              )}
              style={{ transitionDelay: mounted ? "80ms" : "0ms" }}
            >
              {line ?? (
                <span className="text-ink-800/30" aria-hidden>
                  …
                </span>
              )}
            </p>
            <p className="mt-8 text-xs font-medium uppercase tracking-[0.2em] text-brand-700/80">LB Team · apoio</p>
          </div>
        </Card>
        <p className="mt-6 text-center text-xs text-ink-800/50">
          Abra esta tela quando precisar — a mensagem muda a cada visita.
        </p>
      </div>
    </AppShell>
  );
}
