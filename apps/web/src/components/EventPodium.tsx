"use client";

import clsx from "clsx";

export type PodiumLeaderRow = {
  rank: number;
  studentId: string;
  name: string;
  workoutCount: number;
  prizeLabel: string | null;
};

type Props = {
  /** Ordenado por classificação (1.º, 2.º, …). */
  leaderboard: PodiumLeaderRow[];
  prizeTiers: { place: number; prizeLabel: string }[];
  /** Destaca a aluna logada (ex.: “você”). */
  highlightStudentId?: string | null;
  className?: string;
};

/** Número de lugares com prémio configurados (top N do pódio). */
function maxPrizePlace(tiers: { place: number }[]) {
  if (!tiers.length) return 3;
  return Math.max(...tiers.map((t) => t.place));
}

/**
 * Ordem visual estilo Kahoot: 2.º à esquerda, 1.º ao centro (mais alto), 3.º à direita.
 * `top` = primeiras linhas do ranking (já ordenadas).
 */
function kahootOrder(top: PodiumLeaderRow[]): PodiumLeaderRow[] {
  if (top.length === 0) return [];
  if (top.length === 1) return [top[0]!];
  if (top.length === 2) return [top[1]!, top[0]!];
  return [top[1]!, top[0]!, top[2]!];
}

function PodiumBlock({
  row,
  place,
  heightClass,
  gradient,
  ringClass,
  highlight,
}: {
  row: PodiumLeaderRow;
  place: 1 | 2 | 3;
  heightClass: string;
  gradient: string;
  ringClass: string;
  highlight: boolean;
}) {
  const medal = place === 1 ? "🥇" : place === 2 ? "🥈" : "🥉";

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center">
      <div
        className={clsx(
          "mb-2 w-full max-w-[9.5rem] rounded-xl border-2 px-2 py-2 text-center shadow-md",
          highlight
            ? "ring-2 ring-brand-500 ring-offset-2 ring-offset-white"
            : "border-white/40",
        )}
      >
        <p className="truncate font-display text-sm font-bold leading-tight text-ink-900 sm:text-base" title={row.name}>
          {row.name}
        </p>
        {highlight && <p className="mt-0.5 text-[10px] font-semibold uppercase text-brand-700">Você</p>}
        <p className="mt-1 text-[11px] tabular-nums text-ink-800/75">
          <span className="font-semibold text-ink-900">{row.workoutCount}</span> treinos
        </p>
        {row.prizeLabel && (
          <p className="mt-1 line-clamp-2 text-[10px] font-medium leading-snug text-ink-800/85">{row.prizeLabel}</p>
        )}
      </div>
      <div
        className={clsx(
          "flex w-full max-w-[7.5rem] flex-col items-center justify-end rounded-t-2xl border-x border-t border-black/10 px-2 pb-3 pt-6 text-center text-white shadow-inner sm:max-w-[9rem]",
          gradient,
          heightClass,
        )}
      >
        <span className="text-2xl drop-shadow-sm sm:text-3xl" aria-hidden>
          {medal}
        </span>
        <span className={clsx("mt-1 font-display text-3xl font-black tabular-nums drop-shadow-sm sm:text-4xl", ringClass)}>
          {place}
        </span>
        <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-white/90">lugar</span>
      </div>
    </div>
  );
}

export function EventPodium({ leaderboard, prizeTiers, highlightStudentId, className }: Props) {
  const n = maxPrizePlace(prizeTiers);
  const top = leaderboard.slice(0, n);
  const rest = top.slice(3); /* lugares 4+ quando N > 3 */

  if (top.length === 0) {
    return (
      <div className={clsx("rounded-2xl border border-brand-100 bg-white/80 px-4 py-8 text-center text-sm text-ink-800/70", className)}>
        Ainda não há participantes classificados neste evento.
      </div>
    );
  }

  const order3 = kahootOrder(top.slice(0, 3));
  const h1 = "min-h-[9.5rem] sm:min-h-[11rem]";
  const h2 = "min-h-[7rem] sm:min-h-[8.5rem]";
  const h3 = "min-h-[5.5rem] sm:min-h-[6.5rem]";

  return (
    <div className={clsx("space-y-6", className)}>
      <div className="flex flex-wrap items-end justify-center gap-2 sm:gap-4">
        {order3.length === 1 && (
          <div className="flex w-full justify-center">
            <PodiumBlock
              row={order3[0]!}
              place={1}
              heightClass={h1}
              gradient="bg-gradient-to-b from-brand-500 to-brand-700"
              ringClass="text-white"
              highlight={order3[0]!.studentId === highlightStudentId}
            />
          </div>
        )}

        {order3.length === 2 && (
          <>
            <PodiumBlock
              row={order3[0]!}
              place={2}
              heightClass={h2}
              gradient="bg-gradient-to-b from-slate-400 to-slate-600"
              ringClass="text-white"
              highlight={order3[0]!.studentId === highlightStudentId}
            />
            <PodiumBlock
              row={order3[1]!}
              place={1}
              heightClass={h1}
              gradient="bg-gradient-to-b from-brand-500 to-brand-700"
              ringClass="text-white"
              highlight={order3[1]!.studentId === highlightStudentId}
            />
          </>
        )}

        {order3.length >= 3 && (
          <>
            <PodiumBlock
              row={order3[0]!}
              place={2}
              heightClass={h2}
              gradient="bg-gradient-to-b from-slate-400 to-slate-600"
              ringClass="text-white"
              highlight={order3[0]!.studentId === highlightStudentId}
            />
            <PodiumBlock
              row={order3[1]!}
              place={1}
              heightClass={h1}
              gradient="bg-gradient-to-b from-brand-500 to-brand-700"
              ringClass="text-white"
              highlight={order3[1]!.studentId === highlightStudentId}
            />
            <PodiumBlock
              row={order3[2]!}
              place={3}
              heightClass={h3}
              gradient="bg-gradient-to-b from-amber-600 to-amber-900"
              ringClass="text-white"
              highlight={order3[2]!.studentId === highlightStudentId}
            />
          </>
        )}
      </div>

      {rest.length > 0 && (
        <div>
          <p className="mb-3 text-center font-display text-sm font-semibold text-ink-800/80">Demais lugares</p>
          <ul className="mx-auto flex max-w-lg flex-col gap-2">
            {rest.map((r) => (
              <li
                key={r.studentId}
                className={clsx(
                  "flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm",
                  r.studentId === highlightStudentId
                    ? "border-brand-300 bg-brand-50/90"
                    : "border-brand-100/80 bg-white/90",
                )}
              >
                <span className="font-display text-lg font-bold tabular-nums text-brand-800">{r.rank}.º</span>
                <span className="min-w-0 flex-1 truncate font-medium text-ink-900" title={r.name}>
                  {r.name}
                  {r.studentId === highlightStudentId ? (
                    <span className="ml-1 text-xs font-semibold text-brand-700">(você)</span>
                  ) : null}
                </span>
                <span className="shrink-0 tabular-nums text-ink-800/80">{r.workoutCount} treinos</span>
                {r.prizeLabel && <span className="hidden max-w-[40%] truncate text-xs text-ink-800/70 sm:inline">{r.prizeLabel}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
