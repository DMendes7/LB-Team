import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { Role } from "@prisma/client";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, JwtUser } from "../common/decorators/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { GamificationService } from "../gamification/gamification.service";
import { startOfWeekUtc } from "../common/week";

function parseMonthKey(month?: string): { y: number; m: number } {
  const now = new Date();
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return { y: now.getUTCFullYear(), m: now.getUTCMonth() + 1 };
  }
  const [ys, ms] = month.split("-");
  return { y: Number(ys), m: Number(ms) };
}

@Controller("trainer")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TRAINER, Role.ADMIN)
export class TrainerController {
  constructor(
    private prisma: PrismaService,
    private gamification: GamificationService,
  ) {}

  @Get("dashboard")
  async dashboard(@CurrentUser() u: JwtUser) {
    const links = await this.prisma.trainerStudentLink.findMany({
      where: { trainerId: u.sub },
      include: {
        student: {
          include: {
            studentProfile: true,
            userLevel: true,
            streakState: true,
            workoutCompletions: { orderBy: { completedAt: "desc" }, take: 1 },
          },
        },
      },
    });

    const weekStart = startOfWeekUtc(new Date());
    const lowFrequency: typeof links = [];
    const streakRisk: typeof links = [];
    const streakLost: typeof links = [];
    const weeklyHit: typeof links = [];

    for (const l of links) {
      const s = l.student;
      const log = await this.prisma.weeklyFrequencyLog.findUnique({
        where: { userId_weekStart: { userId: s.id, weekStart } },
      });
      const target = this.gamification.weeklyTargetCount(s.studentProfile?.weeklyTarget);
      const done = log?.completedCount ?? 0;
      if (done < target && done < Math.max(1, target - 1)) lowFrequency.push(l);

      const pres = await this.gamification.resolveWorkoutStreakPresentation(s.id);
      if (pres.atRisk) streakRisk.push(l);
      if (pres.hadWorkout && !pres.fireOn && (pres.daysSinceLastWorkout ?? 0) >= 2) streakLost.push(l);
      if (log?.metaGoalMet) weeklyHit.push(l);
    }

    const groups = await this.prisma.workoutGroup.findMany({
      where: { trainerId: u.sub },
      include: { _count: { select: { members: true } }, template: true },
    });

    return {
      activeStudents: links.length,
      lowFrequency,
      streakRisk,
      streakLost,
      weeklyHit,
      groups,
    };
  }

  @Get("workout-groups")
  workoutGroups(@CurrentUser() u: JwtUser) {
    return this.prisma.workoutGroup.findMany({
      where: { trainerId: u.sub },
      include: { _count: { select: { members: true } }, template: true },
      orderBy: { name: "asc" },
    });
  }

  @Get("workout-groups/:groupId")
  async workoutGroupDetail(@CurrentUser() u: JwtUser, @Param("groupId") groupId: string) {
    const group = await this.prisma.workoutGroup.findFirst({
      where: { id: groupId, trainerId: u.sub },
      include: {
        template: { select: { id: true, name: true } },
        members: {
          orderBy: { joinedAt: "asc" },
          include: {
            student: { select: { id: true, name: true, email: true } },
          },
        },
        _count: { select: { members: true } },
      },
    });
    if (!group) throw new NotFoundException("Grupo não encontrado.");
    return group;
  }

  @Get("students")
  students(@CurrentUser() u: JwtUser) {
    return this.prisma.trainerStudentLink.findMany({
      where: { trainerId: u.sub },
      include: {
        student: {
          include: {
            profile: true,
            studentProfile: true,
            userLevel: true,
            streakState: true,
          },
        },
      },
    });
  }

  @Get("students/:studentId/workout-completions/:completionId")
  async trainerWorkoutCompletionDetail(
    @CurrentUser() u: JwtUser,
    @Param("studentId") studentId: string,
    @Param("completionId") completionId: string,
  ) {
    const sl = await this.prisma.trainerStudentLink.findUnique({
      where: { trainerId_studentId: { trainerId: u.sub, studentId } },
    });
    if (!sl) throw new NotFoundException();
    const c = await this.prisma.workoutCompletion.findFirst({
      where: { id: completionId, studentId, completedAt: { not: null } },
      include: {
        template: true,
        exerciseCompletions: {
          orderBy: { orderIndex: "asc" },
          include: { exercise: { select: { id: true, name: true } } },
        },
      },
    });
    if (!c) throw new NotFoundException();
    return c;
  }

  @Get("students/:id")
  async studentDetail(
    @CurrentUser() u: JwtUser,
    @Param("id") id: string,
    @Query("month") month?: string,
  ) {
    const link = await this.prisma.trainerStudentLink.findUnique({
      where: { trainerId_studentId: { trainerId: u.sub, studentId: id } },
      include: {
        student: {
          include: {
            profile: true,
            studentProfile: { include: { physicalLimitations: true, workoutOverride: { include: { template: true } } } },
            userLevel: true,
            streakState: true,
            workoutCompletions: { take: 10, orderBy: { completedAt: "desc" }, include: { template: true } },
            workoutGroupMemberships: {
              where: { group: { trainerId: u.sub } },
              orderBy: { joinedAt: "asc" },
              include: { group: { include: { template: true } } },
            },
          },
        },
      },
    });
    if (!link) throw new NotFoundException();

    const { y, m } = parseMonthKey(month);
    const start = new Date(Date.UTC(y, m - 1, 1));
    const endExcl = new Date(Date.UTC(y, m, 1));

    const monthCompletions = await this.prisma.workoutCompletion.findMany({
      where: {
        studentId: id,
        completedAt: { gte: start, lt: endExcl },
      },
      select: {
        id: true,
        completedAt: true,
        durationSeconds: true,
        template: { select: { name: true } },
      },
      orderBy: { completedAt: "desc" },
    });
    const trainedDates = [
      ...new Set(
        monthCompletions
          .map((c) => (c.completedAt ? c.completedAt.toISOString().slice(0, 10) : null))
          .filter(Boolean) as string[],
      ),
    ].sort();
    const sessionsByDate: Record<
      string,
      { id: string; completedAt: string; durationSeconds: number | null; templateName: string }[]
    > = {};
    for (const c of monthCompletions) {
      if (!c.completedAt) continue;
      const key = c.completedAt.toISOString().slice(0, 10);
      if (!sessionsByDate[key]) sessionsByDate[key] = [];
      sessionsByDate[key].push({
        id: c.id,
        completedAt: c.completedAt.toISOString(),
        durationSeconds: c.durationSeconds,
        templateName: c.template?.name ?? "Treino",
      });
    }

    const slots = await this.prisma.studentWorkoutSlot.findMany({
      where: { studentId: id, trainerId: u.sub },
      orderBy: { sortOrder: "asc" },
      include: { template: true },
    });

    const ov = link.student.studentProfile?.workoutOverride;
    const templateFromOverride =
      ov?.template && ov.template.trainerId === u.sub ? ov.template : null;
    const groupMemberships = link.student.workoutGroupMemberships;
    const groupsWithTemplate = groupMemberships.filter((m) => m.group.template);

    let workoutAssignment:
      | {
          kind: "slots";
          slots: {
            id: string;
            label: string;
            sortOrder: number;
            template: { id: string; name: string; description: string | null };
          }[];
        }
      | {
          kind: "override" | "group" | "none";
          template: { id: string; name: string; description: string | null } | null;
          groupName: string | null;
        }
      | {
          kind: "groups";
          groups: {
            groupName: string;
            template: { id: string; name: string; description: string | null };
          }[];
        };

    if (slots.length > 0) {
      workoutAssignment = {
        kind: "slots",
        slots: slots.map((s) => ({
          id: s.id,
          label: s.label,
          sortOrder: s.sortOrder,
          template: {
            id: s.template.id,
            name: s.template.name,
            description: s.template.description,
          },
        })),
      };
    } else if (templateFromOverride) {
      workoutAssignment = {
        kind: "override",
        template: {
          id: templateFromOverride.id,
          name: templateFromOverride.name,
          description: templateFromOverride.description,
        },
        groupName: null,
      };
    } else if (groupsWithTemplate.length > 1) {
      workoutAssignment = {
        kind: "groups",
        groups: groupsWithTemplate.map((mem) => ({
          groupName: mem.group.name,
          template: {
            id: mem.group.template!.id,
            name: mem.group.template!.name,
            description: mem.group.template!.description,
          },
        })),
      };
    } else if (groupsWithTemplate.length === 1) {
      const mem = groupsWithTemplate[0];
      workoutAssignment = {
        kind: "group",
        template: {
          id: mem.group.template!.id,
          name: mem.group.template!.name,
          description: mem.group.template!.description,
        },
        groupName: mem.group.name,
      };
    } else {
      workoutAssignment = { kind: "none", template: null, groupName: null };
    }

    const streakPres = await this.gamification.resolveWorkoutStreakPresentation(id);

    return {
      ...link,
      student: {
        ...link.student,
        streakState: {
          currentStreak: streakPres.currentStreak,
          maxStreak: link.student.streakState?.maxStreak ?? 0,
          lastActivityAt: link.student.streakState?.lastActivityAt ?? null,
          fireOn: streakPres.fireOn,
        },
      },
      insights: {
        trainingMonth: { year: y, month: m, trainedDates, sessionsByDate },
        slots: slots.map((s) => ({
          id: s.id,
          label: s.label,
          sortOrder: s.sortOrder,
          templateId: s.templateId,
          template: {
            id: s.template.id,
            name: s.template.name,
            description: s.template.description,
            privateForStudentId: s.template.privateForStudentId,
          },
        })),
        workoutAssignment,
        workoutGroups: groupMemberships.map((mem) => ({
          groupId: mem.group.id,
          name: mem.group.name,
          templateName: mem.group.template?.name ?? "—",
        })),
      },
    };
  }

  @Post("workout-groups")
  async createGroup(
    @CurrentUser() u: JwtUser,
    @Body() body: { name: string; description?: string; templateId: string },
  ) {
    const tpl = await this.prisma.workoutTemplate.findFirst({
      where: { id: body.templateId, trainerId: u.sub },
    });
    if (!tpl) throw new NotFoundException("Modelo de treino não encontrado.");
    if (tpl.privateForStudentId) {
      throw new BadRequestException("Fichas exclusivas de uma aluna não podem ser usadas em grupos. Use um modelo da biblioteca.");
    }
    return this.prisma.workoutGroup.create({
      data: {
        trainerId: u.sub,
        name: body.name,
        description: body.description,
        templateId: body.templateId,
      },
    });
  }

  @Patch("workout-groups/:groupId")
  async updateWorkoutGroup(
    @CurrentUser() u: JwtUser,
    @Param("groupId") groupId: string,
    @Body() body: { name?: string; description?: string | null; templateId?: string },
  ) {
    const existing = await this.prisma.workoutGroup.findFirst({
      where: { id: groupId, trainerId: u.sub },
    });
    if (!existing) throw new NotFoundException("Grupo não encontrado.");
    if (body.name !== undefined && !body.name.trim()) {
      throw new BadRequestException("Nome do grupo não pode ser vazio.");
    }
    if (body.templateId !== undefined) {
      const tpl = await this.prisma.workoutTemplate.findFirst({
        where: { id: body.templateId, trainerId: u.sub },
      });
      if (!tpl) throw new NotFoundException("Modelo de treino não encontrado.");
      if (tpl.privateForStudentId) {
        throw new BadRequestException(
          "Fichas exclusivas de uma aluna não podem ser usadas em grupos. Use um modelo da biblioteca.",
        );
      }
    }

    await this.prisma.workoutGroup.update({
      where: { id: groupId },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.description !== undefined && {
          description: body.description === "" ? null : body.description,
        }),
        ...(body.templateId !== undefined && { templateId: body.templateId }),
      },
    });

    const group = await this.prisma.workoutGroup.findFirst({
      where: { id: groupId, trainerId: u.sub },
      include: {
        template: { select: { id: true, name: true } },
        members: {
          orderBy: { joinedAt: "asc" },
          include: {
            student: { select: { id: true, name: true, email: true } },
          },
        },
        _count: { select: { members: true } },
      },
    });
    if (!group) throw new NotFoundException("Grupo não encontrado.");
    return group;
  }

  @Delete("workout-groups/:groupId")
  async deleteWorkoutGroup(@CurrentUser() u: JwtUser, @Param("groupId") groupId: string) {
    const existing = await this.prisma.workoutGroup.findFirst({
      where: { id: groupId, trainerId: u.sub },
    });
    if (!existing) throw new NotFoundException("Grupo não encontrado.");
    await this.prisma.workoutGroup.delete({ where: { id: groupId } });
    return { ok: true };
  }

  @Post("workout-groups/:groupId/members")
  async addMembers(
    @CurrentUser() u: JwtUser,
    @Param("groupId") groupId: string,
    @Body() body: { studentIds: string[] },
  ) {
    const group = await this.prisma.workoutGroup.findFirst({
      where: { id: groupId, trainerId: u.sub },
    });
    if (!group) throw new NotFoundException("Grupo não encontrado.");

    for (const studentId of body.studentIds ?? []) {
      const sl = await this.prisma.trainerStudentLink.findUnique({
        where: { trainerId_studentId: { trainerId: u.sub, studentId } },
      });
      if (!sl) throw new ForbiddenException(`Aluna ${studentId} não está vinculada a você.`);
    }

    return this.prisma.$transaction(
      (body.studentIds ?? []).map((studentId) =>
        this.prisma.workoutGroupUser.upsert({
          where: { groupId_studentId: { groupId, studentId } },
          create: { groupId, studentId },
          update: {},
        }),
      ),
    );
  }

  @Delete("workout-groups/:groupId/members/:studentId")
  async removeGroupMember(
    @CurrentUser() u: JwtUser,
    @Param("groupId") groupId: string,
    @Param("studentId") studentId: string,
  ) {
    const group = await this.prisma.workoutGroup.findFirst({
      where: { id: groupId, trainerId: u.sub },
    });
    if (!group) throw new NotFoundException("Grupo não encontrado.");
    const sl = await this.prisma.trainerStudentLink.findUnique({
      where: { trainerId_studentId: { trainerId: u.sub, studentId } },
    });
    if (!sl) throw new ForbiddenException("Aluna não está vinculada a você.");
    const del = await this.prisma.workoutGroupUser.deleteMany({
      where: { groupId, studentId },
    });
    if (del.count === 0) throw new NotFoundException("Aluna não está neste grupo.");
    return { ok: true };
  }

  @Post("students/:id/workout-override")
  async setOverride(
    @CurrentUser() u: JwtUser,
    @Param("id") id: string,
    @Body() body: { templateId: string },
  ) {
    const sl = await this.prisma.trainerStudentLink.findUnique({
      where: { trainerId_studentId: { trainerId: u.sub, studentId: id } },
    });
    if (!sl) throw new NotFoundException();
    const tpl = await this.prisma.workoutTemplate.findFirst({
      where: { id: body.templateId, trainerId: u.sub },
    });
    if (!tpl) throw new NotFoundException("Modelo não encontrado.");
    if (tpl.privateForStudentId && tpl.privateForStudentId !== id) {
      throw new BadRequestException("Este modelo é exclusivo de outra aluna.");
    }
    return this.prisma.userWorkoutOverride.upsert({
      where: { studentId: id },
      create: { studentId: id, templateId: body.templateId },
      update: { templateId: body.templateId },
    });
  }

  @Delete("students/:id/workout-override")
  async clearOverride(@CurrentUser() u: JwtUser, @Param("id") id: string) {
    const sl = await this.prisma.trainerStudentLink.findUnique({
      where: { trainerId_studentId: { trainerId: u.sub, studentId: id } },
    });
    if (!sl) throw new NotFoundException();
    await this.prisma.userWorkoutOverride.deleteMany({ where: { studentId: id } });
    return { ok: true };
  }

  @Get("students/:id/workout-slots")
  async listWorkoutSlots(@CurrentUser() u: JwtUser, @Param("id") id: string) {
    const sl = await this.prisma.trainerStudentLink.findUnique({
      where: { trainerId_studentId: { trainerId: u.sub, studentId: id } },
    });
    if (!sl) throw new NotFoundException();
    return this.prisma.studentWorkoutSlot.findMany({
      where: { studentId: id, trainerId: u.sub },
      orderBy: { sortOrder: "asc" },
      include: { template: true },
    });
  }

  @Post("students/:id/workout-slots")
  async addWorkoutSlot(
    @CurrentUser() u: JwtUser,
    @Param("id") id: string,
    @Body() body: { label: string; templateId?: string },
  ) {
    const sl = await this.prisma.trainerStudentLink.findUnique({
      where: { trainerId_studentId: { trainerId: u.sub, studentId: id } },
    });
    if (!sl) throw new NotFoundException();
    const label = body.label?.trim();
    if (!label) throw new BadRequestException("Informe o nome do treino (ex.: Treino 1 - Peito).");

    let templateId = body.templateId?.trim();
    if (!templateId) {
      const student = await this.prisma.user.findUnique({ where: { id } });
      const t = await this.prisma.workoutTemplate.create({
        data: {
          trainerId: u.sub,
          privateForStudentId: id,
          name: `${label} (${student?.name ?? "Aluna"})`,
          description: "Ficha exclusiva desta aluna — edite por “Editar ficha” na lista dela.",
          days: {
            create: [{ dayIndex: 0, name: "Dia 1", exercises: { create: [] } }],
          },
        },
      });
      templateId = t.id;
    } else {
      const tpl = await this.prisma.workoutTemplate.findFirst({
        where: { id: templateId, trainerId: u.sub },
      });
      if (!tpl) throw new NotFoundException("Modelo de treino não encontrado.");
      if (tpl.privateForStudentId && tpl.privateForStudentId !== id) {
        throw new BadRequestException("Este modelo é exclusivo de outra aluna.");
      }
    }

    const agg = await this.prisma.studentWorkoutSlot.aggregate({
      where: { studentId: id, trainerId: u.sub },
      _max: { sortOrder: true },
    });
    const sortOrder = (agg._max.sortOrder ?? -1) + 1;

    return this.prisma.studentWorkoutSlot.create({
      data: {
        studentId: id,
        trainerId: u.sub,
        templateId: templateId!,
        label,
        sortOrder,
      },
      include: { template: true },
    });
  }

  @Patch("students/:id/workout-slots/:slotId")
  async patchWorkoutSlot(
    @CurrentUser() u: JwtUser,
    @Param("id") id: string,
    @Param("slotId") slotId: string,
    @Body() body: { label?: string; sortOrder?: number; templateId?: string },
  ) {
    const slot = await this.prisma.studentWorkoutSlot.findFirst({
      where: { id: slotId, studentId: id, trainerId: u.sub },
    });
    if (!slot) throw new NotFoundException();

    if (body.templateId) {
      const tpl = await this.prisma.workoutTemplate.findFirst({
        where: { id: body.templateId, trainerId: u.sub },
      });
      if (!tpl) throw new NotFoundException("Modelo não encontrado.");
      if (tpl.privateForStudentId && tpl.privateForStudentId !== id) {
        throw new BadRequestException("Este modelo é exclusivo de outra aluna.");
      }
    }

    return this.prisma.studentWorkoutSlot.update({
      where: { id: slotId },
      data: {
        ...(body.label !== undefined ? { label: body.label.trim() || slot.label } : {}),
        ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
        ...(body.templateId ? { templateId: body.templateId } : {}),
      },
      include: { template: true },
    });
  }

  @Delete("students/:id/workout-slots/:slotId")
  async deleteWorkoutSlot(
    @CurrentUser() u: JwtUser,
    @Param("id") id: string,
    @Param("slotId") slotId: string,
  ) {
    const slot = await this.prisma.studentWorkoutSlot.findFirst({
      where: { id: slotId, studentId: id, trainerId: u.sub },
      include: { template: true },
    });
    if (!slot) throw new NotFoundException();

    const templateId = slot.templateId;
    const wasPrivateForStudent = slot.template.privateForStudentId === id;

    await this.prisma.studentWorkoutSlot.delete({ where: { id: slotId } });

    if (wasPrivateForStudent) {
      const [slotsLeft, groups, overrides] = await Promise.all([
        this.prisma.studentWorkoutSlot.count({ where: { templateId } }),
        this.prisma.workoutGroup.count({ where: { templateId } }),
        this.prisma.userWorkoutOverride.count({ where: { templateId } }),
      ]);
      if (slotsLeft === 0 && groups === 0 && overrides === 0) {
        await this.prisma.workoutTemplate.deleteMany({ where: { id: templateId, trainerId: u.sub } });
      }
    }

    return { ok: true };
  }
}
