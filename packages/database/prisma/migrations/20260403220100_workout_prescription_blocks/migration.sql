-- Cadência e blocos de prescrição por exercício na ficha
ALTER TABLE "WorkoutExercise" ADD COLUMN IF NOT EXISTS "cadence" TEXT;
ALTER TABLE "WorkoutExercise" ADD COLUMN IF NOT EXISTS "prescription_blocks" JSONB;
