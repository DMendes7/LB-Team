CREATE TABLE "ExerciseVideoAsset" (
    "exercise_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExerciseVideoAsset_pkey" PRIMARY KEY ("exercise_id")
);

CREATE UNIQUE INDEX "ExerciseVideoAsset_key_key" ON "ExerciseVideoAsset"("key");

ALTER TABLE "ExerciseVideoAsset"
ADD CONSTRAINT "ExerciseVideoAsset_exercise_id_fkey"
FOREIGN KEY ("exercise_id") REFERENCES "Exercise"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
