export type PrescriptionBlock = {
  instructions?: string;
  sets: number;
  reps: string;
  weightKg?: number | null;
  restSec: number;
};

function isBlock(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

export function getPrescriptionBlocks(row: {
  prescriptionBlocks: unknown;
  sets: number;
  reps: string;
  restSec: number;
  notes: string | null;
  exercise: { instructions: string | null };
}): PrescriptionBlock[] {
  const raw = row.prescriptionBlocks;
  if (Array.isArray(raw) && raw.length > 0) {
    const out: PrescriptionBlock[] = [];
    for (const item of raw) {
      if (!isBlock(item)) continue;
      const sets = Number(item.sets);
      const restSec = Number(item.restSec);
      if (!Number.isFinite(sets) || !Number.isFinite(restSec)) continue;
      out.push({
        instructions: typeof item.instructions === "string" ? item.instructions : undefined,
        sets,
        reps: typeof item.reps === "string" ? item.reps : String(item.reps ?? ""),
        weightKg: item.weightKg == null || item.weightKg === "" ? null : Number(item.weightKg),
        restSec,
      });
    }
    if (out.length) return out;
  }
  const hint = [row.notes, row.exercise.instructions].filter(Boolean).join("\n\n");
  return [
    {
      instructions: hint || undefined,
      sets: row.sets,
      reps: row.reps,
      weightKg: null,
      restSec: row.restSec,
    },
  ];
}
