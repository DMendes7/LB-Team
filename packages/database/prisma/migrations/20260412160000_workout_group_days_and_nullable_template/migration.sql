-- Planejamento semanal por grupo (dia da semana → modelo). O código já usava este modelo;
-- a tabela e o template_id opcional não estavam na história de migrations antigas.
CREATE TABLE "workout_group_days" (
    "group_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "template_id" TEXT NOT NULL,

    CONSTRAINT "workout_group_days_pkey" PRIMARY KEY ("group_id","day_of_week")
);

ALTER TABLE "workout_group_days" ADD CONSTRAINT "workout_group_days_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "WorkoutGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workout_group_days" ADD CONSTRAINT "workout_group_days_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "WorkoutTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Grupos com rotina na tabela workout_group_days podem ter template_id nulo na linha WorkoutGroup.
ALTER TABLE "WorkoutGroup" DROP CONSTRAINT IF EXISTS "WorkoutGroup_template_id_fkey";
ALTER TABLE "WorkoutGroup" ALTER COLUMN "template_id" DROP NOT NULL;
ALTER TABLE "WorkoutGroup" ADD CONSTRAINT "WorkoutGroup_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "WorkoutTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
