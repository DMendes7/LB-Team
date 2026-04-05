-- Fichas criadas só para uma aluna não entram na biblioteca de "Modelos de treino".
ALTER TABLE "WorkoutTemplate" ADD COLUMN "private_for_student_id" TEXT;

ALTER TABLE "WorkoutTemplate" ADD CONSTRAINT "WorkoutTemplate_private_for_student_id_fkey" FOREIGN KEY ("private_for_student_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
