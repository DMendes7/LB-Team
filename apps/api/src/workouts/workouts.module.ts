import { Module } from "@nestjs/common";
import { WorkoutResolveService } from "./workout-resolve.service";
import { WorkoutsTrainerController } from "./workouts.trainer.controller";

@Module({
  controllers: [WorkoutsTrainerController],
  providers: [WorkoutResolveService],
  exports: [WorkoutResolveService],
})
export class WorkoutsModule {}
