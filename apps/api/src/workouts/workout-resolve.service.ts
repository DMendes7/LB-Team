import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export type WorkoutProgramSlot = {
  id: string;
  label: string;
  sortOrder: number;
  templateId: string;
  templateName: string;
};

export type WorkoutProgramResult =
  | { mode: "none" }
  | { mode: "slots"; slots: WorkoutProgramSlot[] }
  | { mode: "single"; templateId: string; label: string };

@Injectable()
export class WorkoutResolveService {
  constructor(private prisma: PrismaService) {}

  /** Plano da aluna: slots individuais (N treinos) > override único > primeiro grupo. */
  async getWorkoutProgram(studentUserId: string): Promise<WorkoutProgramResult> {
    const links = await this.prisma.trainerStudentLink.findMany({
      where: { studentId: studentUserId },
      select: { trainerId: true },
    });
    const trainerIds = links.map((l) => l.trainerId);

    const slots =
      trainerIds.length === 0
        ? []
        : await this.prisma.studentWorkoutSlot.findMany({
            where: { studentId: studentUserId, trainerId: { in: trainerIds } },
            orderBy: { sortOrder: "asc" },
            include: { template: { select: { id: true, name: true } } },
          });

    if (slots.length > 0) {
      return {
        mode: "slots",
        slots: slots.map((s) => ({
          id: s.id,
          label: s.label,
          sortOrder: s.sortOrder,
          templateId: s.templateId,
          templateName: s.template.name,
        })),
      };
    }

    const ov = await this.prisma.userWorkoutOverride.findUnique({
      where: { studentId: studentUserId },
      include: { template: { select: { id: true, name: true } } },
    });
    if (ov?.template) {
      return { mode: "single", templateId: ov.templateId, label: ov.template.name };
    }

    const groupMemberships =
      trainerIds.length === 0
        ? []
        : await this.prisma.workoutGroupUser.findMany({
            where: {
              studentId: studentUserId,
              group: { trainerId: { in: trainerIds } },
            },
            orderBy: { joinedAt: "asc" },
            include: { group: { include: { template: { select: { id: true, name: true } } } } },
          });

    const withTemplate = groupMemberships.filter((m) => m.group.template);
    if (withTemplate.length === 1) {
      const m = withTemplate[0];
      return { mode: "single", templateId: m.group.templateId, label: m.group.name };
    }
    if (withTemplate.length > 1) {
      return {
        mode: "slots",
        slots: withTemplate.map((m, i) => ({
          id: `wg-${m.groupId}`,
          label: m.group.name,
          sortOrder: i,
          templateId: m.group.templateId,
          templateName: m.group.template!.name,
        })),
      };
    }

    return { mode: "none" };
  }

  /** Primeiro template do programa (compatível com fluxo “treino de hoje” único). */
  async getEffectiveTemplateId(studentUserId: string): Promise<string | null> {
    const p = await this.getWorkoutProgram(studentUserId);
    if (p.mode === "slots" && p.slots.length > 0) return p.slots[0].templateId;
    if (p.mode === "single") return p.templateId;
    return null;
  }

  /** A aluna pode registrar conclusão / ver ficha deste modelo? */
  async studentCanUseTemplate(studentUserId: string, templateId: string): Promise<boolean> {
    const program = await this.getWorkoutProgram(studentUserId);
    if (program.mode === "slots") {
      return program.slots.some((s) => s.templateId === templateId);
    }
    if (program.mode === "single") {
      return program.templateId === templateId;
    }
    return false;
  }

  async getTodayDayIndex(templateId: string): Promise<number> {
    const days = await this.prisma.workoutDay.findMany({
      where: { templateId },
      orderBy: { dayIndex: "asc" },
    });
    if (!days.length) return 0;
    const dow = new Date().getDay();
    return days[dow % days.length]?.dayIndex ?? days[0].dayIndex;
  }

  async loadWorkoutDay(templateId: string, dayIndex: number) {
    return this.prisma.workoutDay.findFirst({
      where: { templateId, dayIndex },
      include: {
        exercises: {
          orderBy: { orderIndex: "asc" },
          include: {
            exercise: {
              include: {
                substitutionsFrom: { include: { substitute: true } },
              },
            },
          },
        },
      },
    });
  }
}
