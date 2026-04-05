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

  async getStreakWindowHours(): Promise<number> {
    const row = await this.prisma.adminSetting.findUnique({ where: { key: "streak_window_hours" } });
    const v = row?.value;
    return typeof v === "number" ? v : 24;
  }

  /** Registra atividade válida para streak e histórico. */
  async recordStreakActivity(userId: string, activityType: string) {
    const hours = await this.getStreakWindowHours();
    const now = new Date();
    const state = await this.prisma.streakState.findUnique({ where: { userId } });
    const windowMs = hours * 60 * 60 * 1000;

    let current = state?.currentStreak ?? 0;
    let max = state?.maxStreak ?? 0;
    const last = state?.lastActivityAt;

    const sameUtcDay = (a: Date, b: Date) =>
      a.getUTCFullYear() === b.getUTCFullYear() &&
      a.getUTCMonth() === b.getUTCMonth() &&
      a.getUTCDate() === b.getUTCDate();

    if (last) {
      const delta = now.getTime() - last.getTime();
      if (delta > windowMs) {
        if (current > 0) {
          await this.prisma.streakLog.create({
            data: { userId, type: "STREAK_LOST", value: current },
          });
        }
        current = 1;
      } else if (!sameUtcDay(last, now)) {
        current += 1;
      }
    } else {
      current = 1;
    }

    max = Math.max(max, current);

    await this.prisma.streakState.upsert({
      where: { userId },
      create: { userId, currentStreak: current, maxStreak: max, lastActivityAt: now },
      update: { currentStreak: current, maxStreak: max, lastActivityAt: now },
    });

    await this.prisma.streakLog.create({
      data: { userId, type: "ACTIVITY", value: 1 },
    });

    await this.prisma.progressHistory.create({
      data: { userId, event: "STREAK_ACTIVITY", payload: { activityType } as object },
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
    const state = await this.prisma.streakState.findUnique({ where: { userId } });
    const hours = await this.getStreakWindowHours();
    const now = Date.now();
    const last = state?.lastActivityAt?.getTime() ?? 0;
    const atRisk = last && now - last > (hours * 60 * 60 * 1000) * 0.7 && now - last < hours * 60 * 60 * 1000;

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
