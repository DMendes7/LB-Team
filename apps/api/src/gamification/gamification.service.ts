import { Injectable } from "@nestjs/common";
import { EngagementTone, WeeklyFrequencyTarget } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { startOfWeekUtc } from "../common/week";

const TARGET_MAP: Record<WeeklyFrequencyTarget, number> = {
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
  SIX: 6,
};

@Injectable()
export class GamificationService {
  constructor(private prisma: PrismaService) {}

  weeklyTargetCount(target: WeeklyFrequencyTarget | null | undefined): number {
    if (!target) return 3;
    return TARGET_MAP[target];
  }

  /** Dias civis completos (UTC) entre a data de `last` e a de `now` (0 = mesmo dia UTC). */
  utcCalendarDaysApart(last: Date, now: Date): number {
    const t0 = Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), last.getUTCDate());
    const t1 = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    return Math.floor((t1 - t0) / 86400000);
  }

  utcDayKey(d: Date): string {
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    const day = d.getUTCDate();
    return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  private utcNoonFromDayKey(key: string): Date {
    const [ys, ms, ds] = key.split("-").map(Number);
    return new Date(Date.UTC(ys, ms - 1, ds, 12, 0, 0));
  }

  /**
   * Streak só conta treinos concluídos (histórico real). Check-in, nutrição, etc. não mantêm o fogo aceso.
   * Dias civis UTC; ≥2 dias sem treino desde o último → 0 e fogo apagado.
   */
  async resolveWorkoutStreakPresentation(
    userId: string,
    now = new Date(),
  ): Promise<{
    currentStreak: number;
    fireOn: boolean;
    atRisk: boolean;
    hadWorkout: boolean;
    daysSinceLastWorkout: number | null;
  }> {
    const rows = await this.prisma.workoutCompletion.findMany({
      where: { studentId: userId, completedAt: { not: null } },
      select: { completedAt: true },
      orderBy: { completedAt: "desc" },
      take: 800,
    });
    const dayKeys = new Set<string>();
    for (const r of rows) {
      dayKeys.add(this.utcDayKey(r.completedAt!));
    }
    if (dayKeys.size === 0) {
      return {
        currentStreak: 0,
        fireOn: false,
        atRisk: false,
        hadWorkout: false,
        daysSinceLastWorkout: null,
      };
    }
    const sorted = [...dayKeys].sort((a, b) => b.localeCompare(a));
    const lastKey = sorted[0]!;
    const lastWorkoutNoon = this.utcNoonFromDayKey(lastKey);
    const daysSinceLast = this.utcCalendarDaysApart(lastWorkoutNoon, now);
    if (daysSinceLast >= 2) {
      return {
        currentStreak: 0,
        fireOn: false,
        atRisk: false,
        hadWorkout: true,
        daysSinceLastWorkout: daysSinceLast,
      };
    }
    let count = 0;
    const d = new Date(lastWorkoutNoon);
    while (true) {
      const k = this.utcDayKey(d);
      if (!dayKeys.has(k)) break;
      count++;
      d.setUTCDate(d.getUTCDate() - 1);
    }
    const alive = count > 0;
    return {
      currentStreak: count,
      fireOn: alive,
      atRisk: alive && daysSinceLast === 1,
      hadWorkout: true,
      daysSinceLastWorkout: daysSinceLast,
    };
  }

  /**
   * Só treino concluído altera sequência e `StreakState`. Outras ações só entram no histórico de progresso
   * (para não “enganar” o fogo com check-in ou abrir nutrição).
   */
  async recordStreakActivity(userId: string, activityType: string) {
    await this.prisma.progressHistory.create({
      data: { userId, event: "STREAK_ACTIVITY", payload: { activityType } as object },
    });

    if (activityType !== "WORKOUT_COMPLETE") {
      return;
    }

    const recent = await this.prisma.workoutCompletion.findMany({
      where: { studentId: userId, completedAt: { not: null } },
      orderBy: { completedAt: "desc" },
      take: 2,
      select: { completedAt: true },
    });
    const newest = recent[0]?.completedAt;
    if (!newest) return;

    const state = await this.prisma.streakState.findUnique({ where: { userId } });
    let current = state?.currentStreak ?? 0;
    let max = state?.maxStreak ?? 0;
    const prev = recent[1]?.completedAt ?? null;

    if (!prev) {
      current = 1;
    } else {
      const daysApart = this.utcCalendarDaysApart(prev, newest);
      if (daysApart === 0) {
        /* segundo+ treino no mesmo dia UTC — mantém contagem */
      } else if (daysApart === 1) {
        current += 1;
      } else {
        if (current > 0) {
          await this.prisma.streakLog.create({
            data: { userId, type: "STREAK_LOST", value: current },
          });
        }
        current = 1;
      }
    }

    max = Math.max(max, current);

    await this.prisma.streakState.upsert({
      where: { userId },
      create: { userId, currentStreak: current, maxStreak: max, lastActivityAt: newest },
      update: { currentStreak: current, maxStreak: max, lastActivityAt: newest },
    });

    await this.prisma.streakLog.create({
      data: { userId, type: "ACTIVITY", value: 1 },
    });
  }

  async afterWorkoutCompleted(userId: string) {
    await this.recordStreakActivity(userId, "WORKOUT_COMPLETE");
    await this.bumpWeeklyProgress(userId);
  }

  async afterCheckin(userId: string) {
    await this.recordStreakActivity(userId, "DAILY_CHECKIN");
  }

  async afterNutritionView(userId: string) {
    await this.recordStreakActivity(userId, "NUTRITION_VIEW");
  }

  private async bumpWeeklyProgress(userId: string) {
    const profile = await this.prisma.studentProfile.findUnique({ where: { userId } });
    const targetN = this.weeklyTargetCount(profile?.weeklyTarget);
    const weekStart = startOfWeekUtc(new Date());

    const weekRow = await this.prisma.weeklyFrequencyLog.findUnique({
      where: { userId_weekStart: { userId, weekStart } },
    });

    const completed = (weekRow?.completedCount ?? 0) + 1;
    const metaGoalMet = completed >= targetN;

    await this.prisma.weeklyFrequencyLog.upsert({
      where: { userId_weekStart: { userId, weekStart } },
      create: {
        userId,
        weekStart,
        completedCount: completed,
        targetCount: targetN,
        metaGoalMet,
      },
      update: { completedCount: completed, targetCount: targetN, metaGoalMet },
    });

    if (metaGoalMet && (!weekRow || !weekRow.metaGoalMet)) {
      await this.applyLevelProgress(userId);
    }
  }

  /** Semana cumprida: avança “semanas de constância” rumo ao próximo nível. */
  private async applyLevelProgress(userId: string) {
    let ul = await this.prisma.userLevel.findUnique({ where: { userId } });
    if (!ul) ul = await this.prisma.userLevel.create({ data: { userId } });

    const rule = await this.prisma.levelRule.findUnique({ where: { level: ul.currentLevel } });
    const weeksNeeded = rule?.weeksRequired ?? 2;
    const nextConsistency = ul.consistencyWeeks + 1;

    if (nextConsistency >= weeksNeeded && ul.currentLevel < 10) {
      await this.prisma.userLevel.update({
        where: { userId },
        data: { currentLevel: ul.currentLevel + 1, consistencyWeeks: 0, progressPercent: 0 },
      });
      await this.prisma.progressHistory.create({
        data: { userId, event: "LEVEL_UP", payload: { to: ul.currentLevel + 1 } },
      });
    } else if (ul.currentLevel < 10) {
      await this.prisma.userLevel.update({
        where: { userId },
        data: {
          consistencyWeeks: nextConsistency,
          progressPercent: Math.min(100, Math.round((nextConsistency / weeksNeeded) * 100)),
        },
      });
    }
  }

  async resolveEngagementMessage(userId: string): Promise<{ tone: EngagementTone; text: string }> {
    const pres = await this.resolveWorkoutStreakPresentation(userId);
    const atRisk = pres.atRisk;

    const weekStart = startOfWeekUtc(new Date());
    const weekLog = await this.prisma.weeklyFrequencyLog.findUnique({
      where: { userId_weekStart: { userId, weekStart } },
    });
    const profile = await this.prisma.studentProfile.findUnique({ where: { userId } });
    const targetN = this.weeklyTargetCount(profile?.weeklyTarget);
    const done = weekLog?.completedCount ?? 0;

    let tone: EngagementTone = EngagementTone.DEFAULT;
    if (atRisk) tone = EngagementTone.STREAK_AT_RISK;
    if (targetN - done === 1 && done > 0) tone = EngagementTone.WEEKLY_ALMOST_DONE;

    const list = await this.prisma.engagementMessage.findMany({
      where: { active: true, tone },
      orderBy: { priority: "desc" },
      take: 5,
    });
    const fallback = await this.prisma.engagementMessage.findMany({
      where: { active: true, tone: EngagementTone.DEFAULT },
      orderBy: { priority: "desc" },
      take: 5,
    });
    const pool = list.length ? list : fallback;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    return { tone, text: pick?.template ?? "Consistência vale mais que perfeição." };
  }
}
