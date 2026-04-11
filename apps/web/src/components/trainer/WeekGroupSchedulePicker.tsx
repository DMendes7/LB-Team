"use client";

import clsx from "clsx";

/** 0 = domingo … 6 = sábado (igual Date.getDay() em horário de Brasília). */
export const WEEKDAY_SHORT = ["D", "S", "T", "Q", "Q", "S", "S"] as const;
export const WEEKDAY_FULL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;

export type TemplateOpt = { id: string; name: string };

export function scheduleRecordToPayload(
  draft: Record<number, string | null>,
): { dayOfWeek: number; templateId: string }[] {
  const out: { dayOfWeek: number; templateId: string }[] = [];
  for (let d = 0; d < 7; d++) {
    const t = draft[d];
    if (t) out.push({ dayOfWeek: d, templateId: t });
  }
  out.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  return out;
}

export function daysFromApiToDraft(
  rows: { dayOfWeek: number; templateId: string }[],
): Record<number, string | null> {
  const draft: Record<number, string | null> = {
    0: null,
    1: null,
    2: null,
    3: null,
    4: null,
    5: null,
    6: null,
  };
  for (const r of rows) {
    draft[r.dayOfWeek] = r.templateId;
  }
  return draft;
}

export function emptyWeekDraft(): Record<number, string | null> {
  return { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null };
}

type Props = {
  draft: Record<number, string | null>;
  onChange: (draft: Record<number, string | null>) => void;
  templates: TemplateOpt[];
  disabled?: boolean;
  /** Texto de ajuda acima da grade (padrão explica treino/dia). */
  hint?: string;
};

export function WeekGroupSchedulePicker({ draft, onChange, templates, disabled, hint }: Props) {
  function setDay(day: number, templateId: string | null) {
    onChange({ ...draft, [day]: templateId });
  }

  const help =
    hint ??
    "Toque no dia e escolha o modelo (1 treino = 1 dia). Mínimo 2 dias com treino. A aluna vê a sugestão por dia, mas pode fazer outro treino se preferir.";

  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-800/70">{help}</p>
      {/* Uma linha com os 7 dias; em telas estreitas rola horizontalmente. */}
      <div className="-mx-1 overflow-x-auto pb-1 pt-0.5">
        <div className="grid min-w-[36rem] grid-cols-7 gap-1.5 sm:min-w-0 sm:gap-2">
          {WEEKDAY_SHORT.map((letter, day) => {
            const filled = !!draft[day];
            return (
              <div key={day} className="flex min-w-0 flex-col items-center gap-1">
                <button
                  type="button"
                  disabled={disabled}
                  title={WEEKDAY_FULL[day]}
                  onClick={() => {
                    if (!templates.length) return;
                    if (!filled) {
                      setDay(day, templates[0].id);
                    }
                  }}
                  className={clsx(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition sm:h-10 sm:w-10 sm:text-sm",
                    filled
                      ? "border-brand-500 bg-gradient-to-br from-brand-500 to-orange-600 text-white shadow-md"
                      : "border-brand-200 bg-white text-ink-800/50 hover:border-brand-300",
                    disabled && "opacity-50",
                  )}
                >
                  {letter}
                </button>
                <select
                  className="w-full min-w-0 truncate rounded-lg border border-brand-200 px-0.5 py-1 text-[9px] sm:px-1 sm:text-[10px]"
                  value={draft[day] ?? ""}
                  disabled={disabled || !templates.length}
                  onChange={(e) => setDay(day, e.target.value || null)}
                  title={WEEKDAY_FULL[day]}
                >
                  <option value="">—</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
