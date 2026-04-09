import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { Role } from "@prisma/client";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, JwtUser } from "../common/decorators/current-user.decorator";
import { GroupEventsService, PrizeTierInput } from "./group-events.service";

@Controller("trainer/group-events")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TRAINER, Role.ADMIN)
export class TrainerGroupEventsController {
  constructor(private events: GroupEventsService) {}

  @Get()
  list(@CurrentUser() u: JwtUser) {
    return this.events.listForTrainer(u.sub);
  }

  @Get(":eventId")
  getOne(@CurrentUser() u: JwtUser, @Param("eventId") eventId: string) {
    return this.events.getEventForTrainer(eventId, u.sub);
  }

  @Post()
  create(
    @CurrentUser() u: JwtUser,
    @Body()
    body: {
      groupId: string;
      name: string;
      description?: string | null;
      prizeNote?: string | null;
      startsAt: string;
      endsAt: string;
      prizeTiers: PrizeTierInput[];
    },
  ) {
    if (!body.groupId?.trim()) throw new BadRequestException("groupId é obrigatório.");
    if (!body.name?.trim()) throw new BadRequestException("Nome é obrigatório.");
    return this.events.createEvent(u.sub, body);
  }

  @Delete(":eventId")
  remove(@CurrentUser() u: JwtUser, @Param("eventId") eventId: string) {
    return this.events.deleteEvent(eventId, u.sub);
  }
}
