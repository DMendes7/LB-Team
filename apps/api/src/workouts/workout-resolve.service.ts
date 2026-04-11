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

  /** Sempre o primeiro dia do modelo (sem rodízio por dia da semana). */
  async getTodayDayIndex(templateId: string): Promise<number> {
    const first = await this.prisma.workoutDay.findFirst({
      where: { templateId },
      orderBy: { dayIndex: "asc" },
      select: { dayIndex: true },
    });
    return first?.dayIndex ?? 0;
  }

  /**
   * Junta todos os dias do modelo numa única lista de exercícios (ordem: dia 0, dia 1, …).
   * Assim a aluna vê o treino completo; o cadastro do personal passou a ser um único dia no editor.
   */
  async loadWorkoutDay(templateId: string, _dayIndex: number) {
    const days = await this.prisma.workoutDay.findMany({
      where: { templateId },
      orderBy: { dayIndex: "asc" },
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
    if (days.length === 0) return null;
    const mergedRows = days.flatMap((d) => d.exercises);
    const exercises = mergedRows.map((row, orderIndex) => ({
      ...row,
      orderIndex,
    }));
    const first = days[0];
    const name =
      days.length === 1
        ? first.name
        : [first.name, ...days.slice(1).map((d) => d.name)].filter(Boolean).join(" · ") || "Treino";
    return {
      id: first.id,
      templateId: first.templateId,
      dayIndex: first.dayIndex,
      name,
      exercises,
    };
  }
}
