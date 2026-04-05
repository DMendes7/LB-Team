import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import { Role } from "@prisma/client";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, JwtUser } from "../common/decorators/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { ReplaceWorkoutTemplateDto } from "./dto/replace-workout-template.dto";

const includeFull = {
  days: { orderBy: { dayIndex: "asc" as const }, include: { exercises: { orderBy: { orderIndex: "asc" as const }, include: { exercise: true } } } },
};

@Controller("trainer/workout-templates")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TRAINER, Role.ADMIN)
export class WorkoutsTrainerController {
  constructor(private prisma: PrismaService) {}

  @Get()
  list(@CurrentUser() u: JwtUser) {
    return this.prisma.workoutTemplate.findMany({
      where: { trainerId: u.sub, privateForStudentId: null },
      include: includeFull,
    });
  }

  @Get(":id")
  async one(@Param("id") id: string, @CurrentUser() u: JwtUser) {
    const t = await this.prisma.workoutTemplate.findFirst({
      where: { id, trainerId: u.sub },
      include: includeFull,
    });
    if (!t) throw new NotFoundException();
    return t;
  }

  @Post()
  create(
    @CurrentUser() u: JwtUser,
    @Body()
    body: {
      name: string;
      description?: string;
      days?: {
        dayIndex: number;
        name: string;
        exercises: {
          exerciseId: string;
          orderIndex: number;
          sets?: number;
          reps?: string;
          durationSec?: number;
          restSec?: number;
          cadence?: string;
          prescriptionBlocks?: unknown;
          notes?: string;
          painAdjustHint?: string;
          equipmentAlt?: string;
        }[];
      }[];
    },
  ) {
    return this.prisma.workoutTemplate.create({
      data: {
        trainerId: u.sub,
        name: body.name,
        description: body.description,
        days: body.days?.length
          ? {
              create: body.days.map((d) => ({
                dayIndex: d.dayIndex,
                name: d.name,
                exercises: {
                  create: d.exercises.map((e) => ({
                    exerciseId: e.exerciseId,
                    orderIndex: e.orderIndex,
                    sets: e.sets ?? 3,
                    reps: e.reps ?? "12",
                    durationSec: e.durationSec,
                    restSec: e.restSec ?? 60,
                    cadence: e.cadence,
                    prescriptionBlocks:
                      e.prescriptionBlocks === undefined || e.prescriptionBlocks === null
                        ? undefined
                        : (e.prescriptionBlocks as object),
                    notes: e.notes,
                    painAdjustHint: e.painAdjustHint,
                    equipmentAlt: e.equipmentAlt,
                  })),
                },
              })),
            }
          : undefined,
      },
      include: includeFull,
    });
  }

  /** Substitui dias e exercícios do modelo (edição completa). */
  @Put(":id")
  async replace(@Param("id") id: string, @CurrentUser() u: JwtUser, @Body() body: ReplaceWorkoutTemplateDto) {
    const exists = await this.prisma.workoutTemplate.findFirst({ where: { id, trainerId: u.sub } });
    if (!exists) throw new NotFoundException();

    await this.prisma.$transaction(async (tx) => {
      await tx.workoutDay.deleteMany({ where: { templateId: id } });
      if (body.name !== undefined || body.description !== undefined) {
        await tx.workoutTemplate.update({
          where: { id },
          data: {
            ...(body.name !== undefined ? { name: body.name } : {}),
            ...(body.description !== undefined ? { description: body.description } : {}),
          },
        });
      }
      for (const d of body.days ?? []) {
        await tx.workoutDay.create({
          data: {
            templateId: id,
            dayIndex: d.dayIndex,
            name: d.name,
            exercises: {
              create: d.exercises.map((e) => ({
                exerciseId: e.exerciseId,
                orderIndex: e.orderIndex,
                sets: e.sets ?? 3,
                reps: e.reps ?? "12",
                durationSec: e.durationSec,
                restSec: e.restSec ?? 60,
                cadence: e.cadence,
                prescriptionBlocks:
                  e.prescriptionBlocks === undefined || e.prescriptionBlocks === null
                    ? undefined
                    : (e.prescriptionBlocks as object),
                notes: e.notes,
              })),
            },
          },
        });
      }
    });

    return this.prisma.workoutTemplate.findUnique({ where: { id }, include: includeFull });
  }

  @Patch(":id")
  update(@Param("id") id: string, @CurrentUser() u: JwtUser, @Body() body: { name?: string; description?: string }) {
    return this.prisma.workoutTemplate.updateMany({
      where: { id, trainerId: u.sub },
      data: body,
    });
  }

  @Delete(":id")
  async remove(@Param("id") id: string, @CurrentUser() u: JwtUser) {
    await this.prisma.workoutTemplate.deleteMany({ where: { id, trainerId: u.sub } });
    return { ok: true };
  }
}
