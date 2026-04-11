/** Alinhado ao backend (`startOfWeekUtc`): segunda 00:00 UTC. */

export function startOfWeekUtc(d: Date): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = x.getUTCDay() || 7;
  if (day !== 1) x.setUTCDate(x.getUTCDate() - (day - 1));
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

export function endOfWeekUtc(weekStart: Date): Date {
  const e = new Date(weekStart);
  e.setUTCDate(e.getUTCDate() + 6);
  e.setUTCHours(23, 59, 59, 999);
  return e;
}

export function toYmdUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function presetWeek(): { from: string; to: string } {
  const ws = startOfWeekUtc(new Date());
  return { from: toYmdUtc(ws), to: toYmdUtc(endOfWeekUtc(ws)) };
}

export function presetMonth(): { from: string; to: string } {
  const n = new Date();
  const from = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 1));
  const to = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return { from: toYmdUtc(from), to: toYmdUtc(to) };
}

export function presetYear(): { from: string; to: string } {
  const y = new Date().getUTCFullYear();
  return {
    from: `${y}-01-01`,
    to: `${y}-12-31`,
  };
}

/** Converte `YYYY-MM-DD` (dia civil) para `dd/MM/yyyy` no fuso local. */
export function formatYmdBrazil(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Data por extenso para tooltips (ex.: 7 de abril de 2026). */
export function formatYmdBrazilLong(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatPeriodPt(fromDay: string, toDay: string): string {
  try {
    const a = new Date(`${fromDay}T12:00:00.000Z`);
    const b = new Date(`${toDay}T12:00:00.000Z`);
    const sameMonth = a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear();
    const opt: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
    if (fromDay === toDay) return a.toLocaleDateString("pt-BR", opt);
    if (sameMonth) {
      return `${a.getUTCDate()} – ${b.toLocaleDateString("pt-BR", opt)}`;
    }
    return `${a.toLocaleDateString("pt-BR", opt)} – ${b.toLocaleDateString("pt-BR", opt)}`;
  } catch {
    return `${fromDay} – ${toDay}`;
  }
}
