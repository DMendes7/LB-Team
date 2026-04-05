-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'TRAINER', 'NUTRITIONIST', 'ADMIN');

-- CreateEnum
CREATE TYPE "StudentGoal" AS ENUM ('WEIGHT_LOSS', 'HYPERTROPHY');

-- CreateEnum
CREATE TYPE "FitnessLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "WeeklyFrequencyTarget" AS ENUM ('TWO', 'THREE', 'FOUR', 'FIVE', 'SIX');

-- CreateEnum
CREATE TYPE "DispositionToday" AS ENUM ('TIRED', 'NORMAL', 'ENERGETIC', 'IN_PAIN', 'NO_TIME');

-- CreateEnum
CREATE TYPE "EngagementTone" AS ENUM ('ON_FIRE', 'FREQUENCY_DROP', 'RETURNED_AFTER_BREAK', 'LEVEL_UP', 'STREAK_LOST', 'WEEKLY_ALMOST_DONE', 'STREAK_AT_RISK', 'STREAK_KEPT', 'DEFAULT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "birth_date" TIMESTAMP(3),
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "user_id" TEXT NOT NULL,
    "weight_kg" DOUBLE PRECISION,
    "height_cm" DOUBLE PRECISION,
    "terms_accepted_at" TIMESTAMP(3),

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "StudentProfile" (
    "user_id" TEXT NOT NULL,
    "goal" "StudentGoal",
    "fitness_level" "FitnessLevel",
    "weekly_target" "WeeklyFrequencyTarget",
    "limitations_notes" TEXT,
    "daily_time_minutes" INTEGER,
    "location_home" BOOLEAN,
    "location_gym" BOOLEAN,
    "equipment_notes" TEXT,
    "focus_regions" TEXT,
    "energy_cycle_notes" TEXT,
    "preferences_notes" TEXT,
    "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
    "disposition_default" TEXT,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "PhysicalLimitation" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "PhysicalLimitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingAnswer" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "OnboardingAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyAvailability" (
    "id" TEXT NOT NULL,
    "student_user_id" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "minutes" INTEGER,

    CONSTRAINT "WeeklyAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainerStudentLink" (
    "trainer_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainerStudentLink_pkey" PRIMARY KEY ("trainer_id","student_id")
);

-- CreateTable
CREATE TABLE "NutritionistStudentLink" (
    "nutritionist_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NutritionistStudentLink_pkey" PRIMARY KEY ("nutritionist_id","student_id")
);

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
    "trainer_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "muscle_group" TEXT NOT NULL,
    "level" "FitnessLevel" NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "instructions" TEXT,
    "video_url" TEXT,
    "image_url" TEXT,
    "equipment" TEXT,
    "contraindications" TEXT,
    "tags" TEXT,
    "technical_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseSubstitution" (
    "id" TEXT NOT NULL,
    "primary_exercise_id" TEXT NOT NULL,
    "substitute_exercise_id" TEXT NOT NULL,

    CONSTRAINT "ExerciseSubstitution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutTemplate" (
    "id" TEXT NOT NULL,
    "trainer_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "objective" "StudentGoal",
    "level" "FitnessLevel",
    "frequency" "WeeklyFrequencyTarget",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutDay" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "day_index" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "WorkoutDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutExercise" (
    "id" TEXT NOT NULL,
    "day_id" TEXT NOT NULL,
    "exercise_id" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,
    "sets" INTEGER NOT NULL DEFAULT 3,
    "reps" TEXT NOT NULL DEFAULT '12',
    "duration_sec" INTEGER,
    "rest_sec" INTEGER NOT NULL DEFAULT 60,
    "notes" TEXT,
    "pain_adjust_hint" TEXT,
    "equipment_alt" TEXT,

    CONSTRAINT "WorkoutExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutGroup" (
    "id" TEXT NOT NULL,
    "trainer_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "template_id" TEXT NOT NULL,

    CONSTRAINT "WorkoutGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutGroupUser" (
    "group_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkoutGroupUser_pkey" PRIMARY KEY ("group_id","student_id")
);

-- CreateTable
CREATE TABLE "UserWorkoutOverride" (
    "student_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,

    CONSTRAINT "UserWorkoutOverride_pkey" PRIMARY KEY ("student_id")
);

-- CreateTable
CREATE TABLE "WorkoutCompletion" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "template_id" TEXT,
    "day_index" INTEGER,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "day_feeling" TEXT,
    "notes" TEXT,

    CONSTRAINT "WorkoutCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseCompletion" (
    "id" TEXT NOT NULL,
    "workout_completion_id" TEXT NOT NULL,
    "exercise_id" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,
    "skipped" BOOLEAN NOT NULL DEFAULT false,
    "substituted_exercise_id" TEXT,
    "notes" TEXT,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "ExerciseCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutritionTemplate" (
    "id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "objective" "StudentGoal",
    "summary" TEXT,
    "guidelines" TEXT,
    "practical_tips" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NutritionTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealSuggestion" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "substitutions" TEXT,
    "order_index" INTEGER NOT NULL,

    CONSTRAINT "MealSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutritionGroup" (
    "id" TEXT NOT NULL,
    "nutritionist_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "template_id" TEXT NOT NULL,

    CONSTRAINT "NutritionGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutritionGroupUser" (
    "group_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NutritionGroupUser_pkey" PRIMARY KEY ("group_id","student_id")
);

-- CreateTable
CREATE TABLE "UserNutritionOverride" (
    "student_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,

    CONSTRAINT "UserNutritionOverride_pkey" PRIMARY KEY ("student_id")
);

-- CreateTable
CREATE TABLE "NutritionGuideline" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "objective" "StudentGoal",
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NutritionGuideline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutritionLog" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NutritionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserLevel" (
    "user_id" TEXT NOT NULL,
    "current_level" INTEGER NOT NULL DEFAULT 1,
    "consistency_weeks" INTEGER NOT NULL DEFAULT 0,
    "progress_percent" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UserLevel_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "LevelRule" (
    "id" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "weeks_required" INTEGER NOT NULL,
    "unlock_summary" TEXT NOT NULL,
    "streak_activities" JSONB NOT NULL,

    CONSTRAINT "LevelRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressHistory" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgressHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyFrequencyLog" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "week_start" TIMESTAMP(3) NOT NULL,
    "completed_count" INTEGER NOT NULL,
    "target_count" INTEGER NOT NULL,
    "meta_goal_met" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "WeeklyFrequencyLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreakState" (
    "user_id" TEXT NOT NULL,
    "current_streak" INTEGER NOT NULL DEFAULT 0,
    "max_streak" INTEGER NOT NULL DEFAULT 0,
    "last_activity_at" TIMESTAMP(3),

    CONSTRAINT "StreakState_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "StreakLog" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StreakLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyCheckin" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "disposition" "DispositionToday" NOT NULL,
    "note" TEXT,
    "mini_mission_done" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyCheckin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EngagementMessage" (
    "id" TEXT NOT NULL,
    "tone" "EngagementTone" NOT NULL,
    "template" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EngagementMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entity_id" TEXT,
    "meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingAnswer_student_id_key_key" ON "OnboardingAnswer"("student_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseSubstitution_primary_exercise_id_substitute_exercis_key" ON "ExerciseSubstitution"("primary_exercise_id", "substitute_exercise_id");

-- CreateIndex
CREATE UNIQUE INDEX "LevelRule_level_key" ON "LevelRule"("level");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyFrequencyLog_user_id_week_start_key" ON "WeeklyFrequencyLog"("user_id", "week_start");

-- CreateIndex
CREATE UNIQUE INDEX "DailyCheckin_user_id_date_key" ON "DailyCheckin"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_code_key" ON "Achievement"("code");

-- CreateIndex
CREATE UNIQUE INDEX "AdminSetting_key_key" ON "AdminSetting"("key");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalLimitation" ADD CONSTRAINT "PhysicalLimitation_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "StudentProfile"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingAnswer" ADD CONSTRAINT "OnboardingAnswer_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "StudentProfile"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyAvailability" ADD CONSTRAINT "WeeklyAvailability_student_user_id_fkey" FOREIGN KEY ("student_user_id") REFERENCES "StudentProfile"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerStudentLink" ADD CONSTRAINT "TrainerStudentLink_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerStudentLink" ADD CONSTRAINT "TrainerStudentLink_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionistStudentLink" ADD CONSTRAINT "NutritionistStudentLink_nutritionist_id_fkey" FOREIGN KEY ("nutritionist_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionistStudentLink" ADD CONSTRAINT "NutritionistStudentLink_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseSubstitution" ADD CONSTRAINT "ExerciseSubstitution_primary_exercise_id_fkey" FOREIGN KEY ("primary_exercise_id") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseSubstitution" ADD CONSTRAINT "ExerciseSubstitution_substitute_exercise_id_fkey" FOREIGN KEY ("substitute_exercise_id") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutTemplate" ADD CONSTRAINT "WorkoutTemplate_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutDay" ADD CONSTRAINT "WorkoutDay_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "WorkoutTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutExercise" ADD CONSTRAINT "WorkoutExercise_day_id_fkey" FOREIGN KEY ("day_id") REFERENCES "WorkoutDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutExercise" ADD CONSTRAINT "WorkoutExercise_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutGroup" ADD CONSTRAINT "WorkoutGroup_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutGroup" ADD CONSTRAINT "WorkoutGroup_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "WorkoutTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutGroupUser" ADD CONSTRAINT "WorkoutGroupUser_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "WorkoutGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutGroupUser" ADD CONSTRAINT "WorkoutGroupUser_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWorkoutOverride" ADD CONSTRAINT "UserWorkoutOverride_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "StudentProfile"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWorkoutOverride" ADD CONSTRAINT "UserWorkoutOverride_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "WorkoutTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutCompletion" ADD CONSTRAINT "WorkoutCompletion_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutCompletion" ADD CONSTRAINT "WorkoutCompletion_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "WorkoutTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseCompletion" ADD CONSTRAINT "ExerciseCompletion_workout_completion_id_fkey" FOREIGN KEY ("workout_completion_id") REFERENCES "WorkoutCompletion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseCompletion" ADD CONSTRAINT "ExerciseCompletion_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionTemplate" ADD CONSTRAINT "NutritionTemplate_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealSuggestion" ADD CONSTRAINT "MealSuggestion_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "NutritionTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionGroup" ADD CONSTRAINT "NutritionGroup_nutritionist_id_fkey" FOREIGN KEY ("nutritionist_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionGroup" ADD CONSTRAINT "NutritionGroup_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "NutritionTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionGroupUser" ADD CONSTRAINT "NutritionGroupUser_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "NutritionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionGroupUser" ADD CONSTRAINT "NutritionGroupUser_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNutritionOverride" ADD CONSTRAINT "UserNutritionOverride_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "StudentProfile"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNutritionOverride" ADD CONSTRAINT "UserNutritionOverride_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "NutritionTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionLog" ADD CONSTRAINT "NutritionLog_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLevel" ADD CONSTRAINT "UserLevel_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressHistory" ADD CONSTRAINT "ProgressHistory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyFrequencyLog" ADD CONSTRAINT "WeeklyFrequencyLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreakState" ADD CONSTRAINT "StreakState_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreakLog" ADD CONSTRAINT "StreakLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyCheckin" ADD CONSTRAINT "DailyCheckin_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

