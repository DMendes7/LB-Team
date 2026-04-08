import { getPrescriptionBlocks } from "./prescription-blocks";

/** Total de séries do exercício na ficha (soma dos blocos de prescrição). */
export function totalSetsForRow(row: {
  prescriptionBlocks: unknown;
  sets: number;
  reps: string;
  restSec: number;
  notes: string | null;
  exercise: { instructions: string | null };
}): number {
  return getPrescriptionBlocks(row).reduce((sum, b) => sum + b.sets, 0);
}

/**
 * Interpreta texto livre: um número = mesma carga em todas as séries;
 * vários separados por vírgula ou ponto-e-vírgula = uma carga por série (1.ª, 2.ª, …).
 * Se faltarem valores, repete o último até completar `totalSets`.
 */
export function parseWeightsInput(raw: string, totalSets: number): number[] | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  const parts = t
    .split(/[,;]+/)
    .map((p) => parseFloat(p.replace(",", ".").trim()))
    .filter((n) => Number.isFinite(n));
  if (parts.length === 0) return undefined;
  const n = Math.max(1, totalSets > 0 ? totalSets : parts.length);
  if (parts.length === 1) return Array.from({ length: n }, () => parts[0]!);
  if (parts.length >= n) return parts.slice(0, n);
  const out = [...parts];
  while (out.length < n) out.push(out[out.length - 1]!);
  return out.slice(0, n);
}

export function formatWeightsRecorded(weightsSeries: unknown, weightKg: number | null): string {
  if (Array.isArray(weightsSeries) && weightsSeries.length > 0) {
    const nums = weightsSeries.filter((x): x is number => typeof x === "number" && Number.isFinite(x));
    if (nums.length) {
      const uniq = new Set(nums.map((x) => Math.round(x * 1000) / 1000));
      if (uniq.size === 1) return `${nums[0]} kg (todas as séries)`;
      return nums.map((w) => `${w}`).join(" → ") + " kg (série a série)";
    }
  }
  if (weightKg != null && Number.isFinite(weightKg)) return `${weightKg} kg`;
  return "";
}
