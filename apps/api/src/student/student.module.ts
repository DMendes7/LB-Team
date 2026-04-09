import { Module } from "@nestjs/common";
import { StudentController } from "./student.controller";
import { WorkoutsModule } from "../workouts/workouts.module";
import { GamificationModule } from "../gamification/gamification.module";
import { StudentLinksModule } from "../student-links/student-links.module";
import { GroupEventsModule } from "../group-events/group-events.module";

@Module({
  imports: [WorkoutsModule, GamificationModule, StudentLinksModule, GroupEventsModule],
  controllers: [StudentController],
})
export class StudentModule {}
