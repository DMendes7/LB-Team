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

function endOfWeekUtc(weekStart: Date): Date {
  const e = new Date(weekStart);
  e.setUTCDate(e.getUTCDate() + 6);
  e.setUTCHours(23, 59, 59, 999);
  return e;
}

function utcDateOnlyFromParts(y: number, month0: number, day: number): Date {
  return new Date(Date.UTC(y, month0, day));
}

/** Lista YYYY-MM-DD de cada dia entre from e to (inclusive), em UTC. */
function enumerateDaysInclusiveUtc(from: Date, to: Date): string[] {
  const out: string[] = [];
  const start = utcDateOnlyFromParts(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const end = utcDateOnlyFromParts(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  const cur = new Date(start.getTime());
  while (cur.getTime() <= end.getTime()) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

const REPORT_TZ = "America/Sao_Paulo";

/** Interpreta YYYY-MM-DD como dia no horário de Brasília e retorna instantes para query no banco. */
function brDayBoundsUtc(ymd: string): { start: Date; end: Date } {
  const start = new Date(`${ymd}T00:00:00-03:00`);
  const end = new Date(`${ymd}T23:59:59.999-03:00`);
  return { start, end };
}

function completionLocalDayKey(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: REPORT_TZ });
}

/** Dias corridos entre dois YYYY-MM-DD (inclusive), calendário em America/Sao_Paulo. */
function enumerateLocalDaysInclusive(fromYmd: string, toYmd: string): string[] {
  const out: string[] = [];
  let cur = new Date(`${fromYmd}T12:00:00-03:00`);
  const end = new Date(`${toYmd}T12:00:00-03:00`);
  while (cur.getTime() <= end.getTime()) {
    out.push(cur.toLocaleDateString("en-CA", { timeZone: REPORT_TZ }));
    cur = new Date(cur.getTime() + 24 * 60 * 60 * 1000);
  }
  return out;
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
  async dashboard(
    @CurrentUser() u: JwtUser,
    @Query("from") fromQ?: string,
    @Query("to") toQ?: string,
    @Query("groupId") groupIdQ?: string,
    @Query("studentId") studentIdQ?: string,
  ) {
    const links = await this.prisma.trainerStudentLink.findMany({
      where: { trainerId: u.sub },
      include: {
        student: { select: { id: true, name: true, email: true } },
      },
    });

    const linkByStudentId = new Map(links.map((l) => [l.studentId, l]));

    const groups = await this.prisma.workoutGroup.findMany({
      where: { trainerId: u.sub },
      include: { _count: { select: { members: true } }, template: true },
      orderBy: { name: "asc" },
    });

    let filterMeta: {
      scope: "all" | "group" | "student";
      groupId: string | null;
      groupName: string | null;
      studentId: string | null;
      studentName: string | null;
    } = { scope: "all", groupId: null, groupName: null, studentId: null, studentName: null };

    let scopedStudentIds: string[] = links.map((l) => l.studentId);

    if (studentIdQ?.trim()) {
      const sid = studentIdQ.trim();
      if (!linkByStudentId.has(sid)) {
        throw new BadRequestException("Aluna não encontrada ou sem vínculo com você.");
      }
      if (groupIdQ?.trim()) {
        const inGroup = await this.prisma.workoutGroupUser.findFirst({
          where: { groupId: groupIdQ.trim(), studentId: sid, group: { trainerId: u.sub } },
        });
        if (!inGroup) throw new BadRequestException("Esta aluna não pertence ao grupo selecionado.");
      }
      scopedStudentIds = [sid];
      filterMeta = {
        scope: "student",
        groupId: groupIdQ?.trim() || null,
        groupName: groupIdQ?.trim() ? groups.find((g) => g.id === groupIdQ.trim())?.name ?? null : null,
        studentId: sid,
        studentName: (linkByStudentId.get(sid)!.student.name ?? linkByStudentId.get(sid)!.student.email ?? "Aluna").trim(),
      };
    } else if (groupIdQ?.trim()) {
      const gid = groupIdQ.trim();
      const g = groups.find((x) => x.id === gid);
      if (!g) throw new BadRequestException("Grupo não encontrado.");
      const members = await this.prisma.workoutGroupUser.findMany({
        where: { groupId: gid },
        select: { studentId: true },
      });
      const memberSet = new Set(members.map((m) => m.studentId));
      scopedStudentIds = links.map((l) => l.studentId).filter((id) => memberSet.has(id));
      filterMeta = {
        scope: "group",
        groupId: gid,
        groupName: g.name,
        studentId: null,
        studentName: null,
      };
    }

    const activeStudents = scopedStudentIds.length;

    const explicitRange = !!(fromQ && toQ && /^\d{4}-\d{2}-\d{2}$/.test(fromQ) && /^\d{4}-\d{2}-\d{2}$/.test(toQ));

    let from: Date;
    let to: Date;
    let activityDayKeys: string[];
    const dayKey = (d: Date) => (explicitRange ? completionLocalDayKey(d) : d.toISOString().slice(0, 10));

    if (explicitRange) {
      if (fromQ! > toQ!) {
        throw new BadRequestException("Data inicial deve ser anterior ou igual à final.");
      }
      const maxMs = 400 * 24 * 60 * 60 * 1000;
      const startB = brDayBoundsUtc(fromQ!).start;
      const endB = brDayBoundsUtc(toQ!).end;
      if (endB.getTime() - startB.getTime() > maxMs) {
        throw new BadRequestException("Intervalo máximo: 400 dias.");
      }
      from = startB;
      to = endB;
      activityDayKeys = enumerateLocalDaysInclusive(fromQ!, toQ!);
    } else {
      const ws = startOfWeekUtc(new Date());
      from = ws;
      to = endOfWeekUtc(ws);
      const fromDay = utcDateOnlyFromParts(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
      const toDay = utcDateOnlyFromParts(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
      activityDayKeys = enumerateDaysInclusiveUtc(fromDay, toDay);
    }

    let fromDayForCheckin: Date;
    let toDayForCheckin: Date;
    if (explicitRange) {
      fromDayForCheckin = new Date(`${fromQ!}T00:00:00.000Z`);
      toDayForCheckin = new Date(`${toQ!}T00:00:00.000Z`);
    } else {
      fromDayForCheckin = utcDateOnlyFromParts(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
      toDayForCheckin = utcDateOnlyFromParts(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
    }

    if (activeStudents === 0) {
      return {
        activeStudents: 0,
        filter: filterMeta,
        period: {
          from: from.toISOString(),
          to: to.toISOString(),
          fromDay: activityDayKeys[0] ?? fromDayForCheckin.toISOString().slice(0, 10),
          toDay: activityDayKeys[activityDayKeys.length - 1] ?? toDayForCheckin.toISOString().slice(0, 10),
        },
        metrics: {
          workoutsCompleted: 0,
          studentsTrained: 0,
          engagementRate: 0,
          studentsInactive: 0,
          totalMinutes: 0,
          avgMinutesPerWorkout: 0,
          avgWorkoutsPerTrainingStudent: 0,
          checkInsCount: 0,
          studentsWithCheckIn: 0,
        },
        activityByDay: activityDayKeys.map((date) => ({ date, count: 0 })),
        inactiveSample: [] as { id: string; name: string }[],
        groups,
      };
    }

    const completions = await this.prisma.workoutCompletion.findMany({
      where: {
        studentId: { in: scopedStudentIds },
        completedAt: { not: null, gte: from, lte: to },
      },
      select: { studentId: true, completedAt: true, durationSeconds: true },
    });

    const trained = new Set(completions.map((c) => c.studentId));
    const workoutsCompleted = completions.length;
    const studentsTrained = trained.size;
    const engagementRate =
      activeStudents > 0 ? Math.round((studentsTrained / activeStudents) * 1000) / 10 : 0;
    const studentsInactive = activeStudents - studentsTrained;

    let totalSec = 0;
    for (const c of completions) {
      totalSec += c.durationSeconds ?? 0;
    }
    const totalMinutes = Math.round(totalSec / 60);
    const avgMinutesPerWorkout =
      workoutsCompleted > 0 ? Math.round((totalSec / workoutsCompleted / 60) * 10) / 10 : 0;
    const avgWorkoutsPerTrainingStudent =
      studentsTrained > 0 ? Math.round((workoutsCompleted / studentsTrained) * 10) / 10 : 0;

    const countByDay = new Map<string, number>();
    for (const c of completions) {
      if (!c.completedAt) continue;
      const key = dayKey(c.completedAt);
      countByDay.set(key, (countByDay.get(key) ?? 0) + 1);
    }

    const activityByDay = activityDayKeys.map((date) => ({
      date,
      count: countByDay.get(date) ?? 0,
    }));

    const checkInsCount = await this.prisma.dailyCheckin.count({
      where: {
        userId: { in: scopedStudentIds },
        date: { gte: fromDayForCheckin, lte: toDayForCheckin },
      },
    });

    const checkInUsers = await this.prisma.dailyCheckin.findMany({
      where: {
        userId: { in: scopedStudentIds },
        date: { gte: fromDayForCheckin, lte: toDayForCheckin },
      },
      select: { userId: true },
      distinct: ["userId"],
    });
    const studentsWithCheckIn = checkInUsers.length;

    const scopedLinks = links.filter((l) => scopedStudentIds.includes(l.studentId));
    const inactiveSample = scopedLinks
      .filter((l) => !trained.has(l.studentId))
      .slice(0, 10)
      .map((l) => ({
        id: l.student.id,
        name: (l.student.name ?? l.student.email ?? "Aluna").trim(),
      }));

    return {
      activeStudents,
      filter: filterMeta,
      period: {
        from: from.toISOString(),
        to: to.toISOString(),
        fromDay: activityDayKeys[0] ?? fromDayForCheckin.toISOString().slice(0, 10),
        toDay: activityDayKeys[activityDayKeys.length - 1] ?? toDayForCheckin.toISOString().slice(0, 10),
      },
      metrics: {
        workoutsCompleted,
        studentsTrained,
        engagementRate,
        studentsInactive,
        totalMinutes,
        avgMinutesPerWorkout,
        avgWorkoutsPerTrainingStudent,
        checkInsCount,
        studentsWithCheckIn,
      },
      activityByDay,
      inactiveSample,
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
            create: [{ dayIndex: 0, name: "Treino", exercises: { create: [] } }],
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
