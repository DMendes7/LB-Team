import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { Role, DispositionToday } from "@prisma/client";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, JwtUser } from "../common/decorators/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { WorkoutResolveService } from "../workouts/workout-resolve.service";
import { GamificationService } from "../gamification/gamification.service";
import { StudentLinksService } from "../student-links/student-links.service";
import { startOfWeekUtc } from "../common/week";

@Controller("student")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT)
export class StudentController {
  constructor(
    private prisma: PrismaService,
    private resolve: WorkoutResolveService,
    private gamification: GamificationService,
    private studentLinks: StudentLinksService,
  ) {}

  @Get("dashboard")
  async dashboard(@CurrentUser() u: JwtUser) {
    await this.studentLinks.ensureDefaultProfessionalLinks(u.sub);

    const [profile, level, streak, msg, weekLog, program] = await Promise.all([
      this.prisma.studentProfile.findUnique({ where: { userId: u.sub } }),
      this.prisma.userLevel.findUnique({ where: { userId: u.sub } }),
      this.prisma.streakState.findUnique({ where: { userId: u.sub } }),
      this.gamification.resolveEngagementMessage(u.sub),
      this.prisma.weeklyFrequencyLog.findUnique({
        where: {
          userId_weekStart: { userId: u.sub, weekStart: startOfWeekUtc(new Date()) },
        },
      }),
      this.resolve.getWorkoutProgram(u.sub),
    ]);

    const target = this.gamification.weeklyTargetCount(profile?.weeklyTarget);
    const completedThisWeek = weekLog?.completedCount ?? 0;

    const hours = await this.gamification.getStreakWindowHours();
    const last = streak?.lastActivityAt?.getTime() ?? 0;
    const streakAlive = last && Date.now() - last < hours * 60 * 60 * 1000;

    return {
      greeting: profile?.onboardingCompleted ? "Olá, vamos com calma e constância hoje." : "Complete seu onboarding para liberar o plano.",
      profile,
      level,
      streak: {
        ...streak,
        fireOn: !!streakAlive,
        windowHours: hours,
      },
      weekly: { completed: completedThisWeek, target },
      engagement: msg,
      hasWorkoutPlan: program.mode !== "none",
      workoutProgram: program,
    };
  }

  @Get("workout-program")
  workoutProgram(@CurrentUser() u: JwtUser) {
    return this.resolve.getWorkoutProgram(u.sub);
  }

  @Get("workout-session")
  async workoutSession(@CurrentUser() u: JwtUser, @Query("templateId") templateId: string) {
    if (!templateId?.trim()) throw new BadRequestException("templateId é obrigatório.");
    const can = await this.resolve.studentCanUseTemplate(u.sub, templateId);
    if (!can) throw new ForbiddenException("Este treino não faz parte do seu plano.");

    const dayIndex = await this.resolve.getTodayDayIndex(templateId);
    const day = await this.resolve.loadWorkoutDay(templateId, dayIndex);
    const template = await this.prisma.workoutTemplate.findUnique({ where: { id: templateId } });

    return {
      template,
      day: day ? { ...day, dayIndex: day.dayIndex } : null,
      adaptationHint: "Se estiver cansada, reduza uma série ou use substituições sugeridas.",
    };
  }

  @Get("workout-today")
  async workoutToday(@CurrentUser() u: JwtUser) {
    const program = await this.resolve.getWorkoutProgram(u.sub);
    const templateId =
      program.mode === "slots" && program.slots.length > 0
        ? program.slots[0].templateId
        : program.mode === "single"
          ? program.templateId
          : null;
    if (!templateId) return { template: null, day: null, adaptationHint: null, program };

    const dayIndex = await this.resolve.getTodayDayIndex(templateId);
    const day = await this.resolve.loadWorkoutDay(templateId, dayIndex);
    const template = await this.prisma.workoutTemplate.findUnique({ where: { id: templateId } });

    return {
      template,
      day: day ? { ...day, dayIndex: day.dayIndex } : null,
      adaptationHint: "Se estiver cansada, reduza uma série ou use substituições sugeridas.",
      program,
    };
  }

  @Post("workout-complete")
  async complete(
    @CurrentUser() u: JwtUser,
    @Body()
    body: {
      templateId?: string;
      dayIndex?: number;
      /** Percepção de esforço do treino (ex.: LIGHT, MODERATE, HARD). */
      dayFeeling?: string;
      notes?: string;
      /** Check-in “como estava hoje”, gravado no mesmo dia sem nova pontuação de streak. */
      disposition?: DispositionToday;
      exercises: { exerciseId: string; orderIndex: number; skipped?: boolean; substitutedId?: string | null; notes?: string }[];
    },
  ) {
    let templateId = body.templateId ?? (await this.resolve.getEffectiveTemplateId(u.sub));
    if (!templateId) return { error: "Sem plano de treino atribuído." };
    const allowed = await this.resolve.studentCanUseTemplate(u.sub, templateId);
    if (!allowed) return { error: "Este modelo não faz parte do seu plano atual." };

    const completion = await this.prisma.workoutCompletion.create({
      data: {
        studentId: u.sub,
        templateId,
        dayIndex: body.dayIndex,
        completedAt: new Date(),
        dayFeeling: body.dayFeeling,
        notes: body.notes,
        exerciseCompletions: {
          create: body.exercises.map((e) => ({
            exerciseId: e.exerciseId,
            orderIndex: e.orderIndex,
            skipped: e.skipped ?? false,
            substitutedId: e.substitutedId ?? undefined,
            notes: e.notes,
            completedAt: e.skipped ? null : new Date(),
          })),
        },
      },
      include: { exerciseCompletions: true },
    });

    await this.gamification.afterWorkoutCompleted(u.sub);

    if (body.disposition !== undefined && body.disposition !== null) {
      if (!Object.values(DispositionToday).includes(body.disposition)) {
        throw new BadRequestException("disposition inválida.");
      }
      const date = new Date();
      date.setUTCHours(0, 0, 0, 0);
      const note =
        body.notes !== undefined && body.notes !== null ? (body.notes.trim() || null) : undefined;
      await this.prisma.dailyCheckin.upsert({
        where: { userId_date: { userId: u.sub, date } },
        create: {
          userId: u.sub,
          date,
          disposition: body.disposition,
          note: note ?? null,
          miniMissionDone: true,
        },
        update: {
          disposition: body.disposition,
          miniMissionDone: true,
          ...(note !== undefined ? { note } : {}),
        },
      });
    }

    return completion;
  }

  @Post("checkin")
  async checkin(
    @CurrentUser() u: JwtUser,
    @Body() body: { disposition: DispositionToday; note?: string; miniMissionDone?: boolean },
  ) {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    const row = await this.prisma.dailyCheckin.upsert({
      where: { userId_date: { userId: u.sub, date } },
      create: {
        userId: u.sub,
        date,
        disposition: body.disposition,
        note: body.note,
        miniMissionDone: body.miniMissionDone ?? false,
      },
      update: {
        disposition: body.disposition,
        note: body.note,
        miniMissionDone: body.miniMissionDone ?? false,
      },
    });
    await this.gamification.afterCheckin(u.sub);
    return row;
  }

  @Post("disposition-today")
  async disposition(@CurrentUser() u: JwtUser, @Body() body: { disposition: DispositionToday }) {
    await this.prisma.studentProfile.update({
      where: { userId: u.sub },
      data: { dispositionDefault: body.disposition },
    });
    await this.gamification.recordStreakActivity(u.sub, "DISPOSITION_LOG");
    return {
      suggestion:
        body.disposition === "TIRED"
          ? "Sugestão: versão reduzida do treino ou mobilidade leve."
          : body.disposition === "NO_TIME"
            ? "Sugestão: bloco rápido de 12–15 min com exercícios compostos."
            : body.disposition === "IN_PAIN"
              ? "Priorize substituições e evite cargas altas; avise sua personal."
              : "Ótimo dia para seguir o plano com presença e técnica.",
    };
  }

  @Post("nutrition/open")
  async nutritionOpen(@CurrentUser() u: JwtUser) {
    await this.gamification.afterNutritionView(u.sub);
    return { ok: true };
  }

  @Get("history/workouts")
  history(@CurrentUser() u: JwtUser) {
    return this.prisma.workoutCompletion.findMany({
      where: { studentId: u.sub },
      orderBy: { startedAt: "desc" },
      take: 30,
      include: { template: true },
    });
  }

  @Get("nutrition-plan")
  async nutritionPlan(@CurrentUser() u: JwtUser) {
    const ov = await this.prisma.userNutritionOverride.findUnique({ where: { studentId: u.sub } });
    let templateId = ov?.templateId;
    if (!templateId) {
      const m = await this.prisma.nutritionGroupUser.findFirst({
        where: { studentId: u.sub },
        include: { group: true },
      });
      templateId = m?.group.templateId;
    }
    if (!templateId) return { template: null };
    const template = await this.prisma.nutritionTemplate.findUnique({
      where: { id: templateId },
      include: { meals: { orderBy: { orderIndex: "asc" } } },
    });
    return { template, fromOverride: !!ov };
  }
}
