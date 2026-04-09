-- CreateEnum
CREATE TYPE "GroupEventMetric" AS ENUM ('WORKOUT_COMPLETIONS');

-- CreateTable
CREATE TABLE "group_events" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "trainer_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "prize_note" TEXT,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "metric" "GroupEventMetric" NOT NULL DEFAULT 'WORKOUT_COMPLETIONS',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_event_prize_tiers" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "place" INTEGER NOT NULL,
    "prize_label" TEXT NOT NULL,

    CONSTRAINT "group_event_prize_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_event_scores" (
    "event_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "workout_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_event_scores_pkey" PRIMARY KEY ("event_id","student_id")
);

-- CreateIndex
CREATE INDEX "group_events_group_id_idx" ON "group_events"("group_id");

-- CreateIndex
CREATE INDEX "group_events_trainer_id_idx" ON "group_events"("trainer_id");

-- CreateIndex
CREATE INDEX "group_events_ends_at_idx" ON "group_events"("ends_at");

-- CreateIndex
CREATE UNIQUE INDEX "group_event_prize_tiers_event_id_place_key" ON "group_event_prize_tiers"("event_id", "place");

-- AddForeignKey
ALTER TABLE "group_events" ADD CONSTRAINT "group_events_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "WorkoutGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_events" ADD CONSTRAINT "group_events_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_event_prize_tiers" ADD CONSTRAINT "group_event_prize_tiers_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "group_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_event_scores" ADD CONSTRAINT "group_event_scores_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "group_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_event_scores" ADD CONSTRAINT "group_event_scores_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
