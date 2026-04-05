import { Module } from "@nestjs/common";
import { StudentController } from "./student.controller";
import { WorkoutsModule } from "../workouts/workouts.module";
import { GamificationModule } from "../gamification/gamification.module";
import { StudentLinksModule } from "../student-links/student-links.module";

@Module({
  imports: [WorkoutsModule, GamificationModule, StudentLinksModule],
  controllers: [StudentController],
})
export class StudentModule {}
