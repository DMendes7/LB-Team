import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export type WorkoutProgramSlot = {
  id: string;
  label: string;
  sortOrder: number;
  templateId: string;
  templateName: string;
  /** 0=dom … 6=sab — planejamento semanal do grupo */
  dayOfWeek?: number;
  /** Origem do slot na UI (individual + grupo podem aparecer juntos). */
  origin?: "individual" | "group";
};

export type WorkoutProgramRoutineHint = {
  /** Texto curto para UI, ex.: sugestão do dia */
  title: string;
  templateId: string;
  templateName: string;
};

export type WorkoutProgramResult =
  | { mode: "none" }
  | { mode: "slots"; slots: WorkoutProgramSlot[]; routineHint?: WorkoutProgramRoutineHint | null }
  | { mode: "single"; templateId: string; label: string; routineHint?: WorkoutProgramRoutineHint | null };

const DAY_SHORT_BR = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function saoPauloWeekday0Sun(): number {
  const s = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
  return new Date(s).getDay();
}

type GroupForSchedule = {
  id: string;
  name: string;
  templateId: string | null;
  template: { id: string; name: string } | null;
  days: { dayOfWeek: number; templateId: string; template: { name: string } }[];
};

function slotsFromGroupSchedule(group: GroupForSchedule, groupNamePrefix?: string): WorkoutProgramSlot[] {
  if (group.days.length > 0) {
    return [...group.days]
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
      .map((d) => ({
        id: `wg-${group.id}-d${d.dayOfWeek}`,
        label: groupNamePrefix
          ? `${groupNamePrefix} · ${DAY_SHORT_BR[d.dayOfWeek]} · ${d.template.name}`
          : `${DAY_SHORT_BR[d.dayOfWeek]} · ${d.template.name}`,
        sortOrder: d.dayOfWeek,
        templateId: d.templateId,
        templateName: d.template.name,
        dayOfWeek: d.dayOfWeek,
        origin: "group" as const,
      }));
  }
  if (group.templateId && group.template) {
    return [
      {
        id: `wg-${group.id}`,
        label: group.name,
        sortOrder: 0,
        templateId: group.templateId,
        templateName: group.template.name,
        origin: "group" as const,
      },
    ];
  }
  return [];
}

function pickRoutineHint(slots: WorkoutProgramSlot[]): WorkoutProgramRoutineHint | null {
  const dow = saoPauloWeekday0Sun();
  const hit = slots.find((s) => s.dayOfWeek === dow);
  if (!hit) return null;
  return {
    title: `Sugestão de hoje (${DAY_SHORT_BR[dow]}): ${hit.templateName} — você pode escolher outro treino abaixo.`,
    templateId: hit.templateId,
    templateName: hit.templateName,
  };
}

@Injectable()
export class WorkoutResolveService {
  constructor(private prisma: PrismaService) {}

  /**
   * Plano da aluna: fichas individuais (slots) + rotina do(s) grupo(s) quando existirem;
   * sem slots nem grupo → override único > nada.
   */
  async getWorkoutProgram(studentUserId: string): Promise<WorkoutProgramResult> {
    const links = await this.prisma.trainerStudentLink.findMany({
      where: { studentId: studentUserId },
      select: { trainerId: true },
    });
    const trainerIds = links.map((l) => l.trainerId);

    const individualRows =
      trainerIds.length === 0
        ? []
        : await this.prisma.studentWorkoutSlot.findMany({
            where: { studentId: studentUserId, trainerId: { in: trainerIds } },
            orderBy: { sortOrder: "asc" },
            include: { template: { select: { id: true, name: true } } },
          });

    const groupMemberships =
      trainerIds.length === 0
        ? []
        : await this.prisma.workoutGroupUser.findMany({
            where: {
              studentId: studentUserId,
              group: { trainerId: { in: trainerIds } },
            },
            orderBy: { joinedAt: "asc" },
            include: {
              group: {
                include: {
                  template: { select: { id: true, name: true } },
                  days: {
                    orderBy: { dayOfWeek: "asc" },
                    include: { template: { select: { id: true, name: true } } },
                  },
                },
              },
            },
          });

    const withProgram = groupMemberships.filter(
      (m) => m.group.days.length > 0 || m.group.templateId,
    );

    const groupSlotsOnly: WorkoutProgramSlot[] = [];
    if (withProgram.length === 1) {
      groupSlotsOnly.push(...slotsFromGroupSchedule(withProgram[0].group as GroupForSchedule));
    } else if (withProgram.length > 1) {
      groupSlotsOnly.push(
        ...withProgram.flatMap((m) =>
          slotsFromGroupSchedule(m.group as GroupForSchedule, m.group.name),
        ),
      );
    }

    const hasIndividual = individualRows.length > 0;
    const hasGroupSlots = groupSlotsOnly.length > 0;

    if (hasIndividual && hasGroupSlots) {
      const ind: WorkoutProgramSlot[] = individualRows.map((s, i) => ({
        id: s.id,
        label: `Seu plano · ${s.label}`,
        sortOrder: i,
        templateId: s.templateId,
        templateName: s.template.name,
        origin: "individual",
      }));
      const start = ind.length;
      const grp = groupSlotsOnly.map((g, j) => ({
        ...g,
        sortOrder: start + j,
      }));
      const merged = [...ind, ...grp];
      return {
        mode: "slots",
        slots: merged,
        routineHint: pickRoutineHint(groupSlotsOnly),
      };
    }

    if (hasIndividual) {
      return {
        mode: "slots",
        slots: individualRows.map((s) => ({
          id: s.id,
          label: s.label,
          sortOrder: s.sortOrder,
          templateId: s.templateId,
          templateName: s.template.name,
          origin: "individual",
        })),
      };
    }

    if (hasGroupSlots) {
      if (withProgram.length === 1) {
        const g = withProgram[0].group as GroupForSchedule;
        if (g.days.length === 0 && g.templateId && g.template) {
          return { mode: "single", templateId: g.templateId, label: g.name };
        }
      }
      return {
        mode: "slots",
        slots: groupSlotsOnly,
        routineHint: pickRoutineHint(groupSlotsOnly),
      };
    }

    const ov = await this.prisma.userWorkoutOverride.findUnique({
      where: { studentId: studentUserId },
      include: { template: { select: { id: true, name: true } } },
    });
    if (ov?.template) {
      return { mode: "single", templateId: ov.templateId, label: ov.template.name };
    }

    return { mode: "none" };
  }

  /** Primeiro template do programa (compatível com fluxo “treino de hoje” único). */
  async getEffectiveTemplateId(studentUserId: string): Promise<string | null> {
    const p = await this.getWorkoutProgram(studentUserId);
    if (p.mode === "slots" && p.slots.length > 0) {
      if (p.routineHint) return p.routineHint.templateId;
      return p.slots[0].templateId;
    }
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
