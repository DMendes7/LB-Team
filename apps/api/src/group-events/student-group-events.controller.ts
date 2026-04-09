import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { Role } from "@prisma/client";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, JwtUser } from "../common/decorators/current-user.decorator";
import { GroupEventsService } from "./group-events.service";

@Controller("student/group-events")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT)
export class StudentGroupEventsController {
  constructor(private events: GroupEventsService) {}

  @Get()
  list(@CurrentUser() u: JwtUser) {
    return this.events.listForStudent(u.sub);
  }

  @Get(":eventId")
  getOne(@CurrentUser() u: JwtUser, @Param("eventId") eventId: string) {
    return this.events.getEventForStudent(eventId, u.sub);
  }
}
