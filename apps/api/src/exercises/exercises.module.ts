import { Module } from "@nestjs/common";
import { ExercisesTrainerController } from "./exercises.trainer.controller";

@Module({
  controllers: [ExercisesTrainerController],
})
export class ExercisesModule {}
