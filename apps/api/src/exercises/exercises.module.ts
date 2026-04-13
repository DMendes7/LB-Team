import { Module } from "@nestjs/common";
import { ExerciseFilesController } from "./exercise-files.controller";
import { ExercisesTrainerController } from "./exercises.trainer.controller";

@Module({
  controllers: [ExercisesTrainerController, ExerciseFilesController],
})
export class ExercisesModule {}
