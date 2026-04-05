-- Vários treinos nomeados por aluna (plano individual)
CREATE TABLE "StudentWorkoutSlot" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "trainer_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentWorkoutSlot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StudentWorkoutSlot_student_id_sort_order_idx" ON "StudentWorkoutSlot"("student_id", "sort_order");

ALTER TABLE "StudentWorkoutSlot" ADD CONSTRAINT "StudentWorkoutSlot_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentWorkoutSlot" ADD CONSTRAINT "StudentWorkoutSlot_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentWorkoutSlot" ADD CONSTRAINT "StudentWorkoutSlot_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "WorkoutTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
