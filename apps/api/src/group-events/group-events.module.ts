import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { GroupEventsService } from "./group-events.service";
import { TrainerGroupEventsController } from "./trainer-group-events.controller";
import { StudentGroupEventsController } from "./student-group-events.controller";

@Module({
  imports: [PrismaModule],
  controllers: [TrainerGroupEventsController, StudentGroupEventsController],
  providers: [GroupEventsService],
  exports: [GroupEventsService],
})
export class GroupEventsModule {}
