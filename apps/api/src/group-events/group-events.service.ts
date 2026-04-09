import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { GroupEventMetric } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export type PrizeTierInput = { place: number; prizeLabel: string };

@Injectable()
export class GroupEventsService {
  constructor(private prisma: PrismaService) {}

  /** Cada treino concluído dentro do período do evento soma +1 no ranking do grupo. */
  async recordWorkoutCompletion(studentId: string, completedAt: Date): Promise<void> {
    const memberships = await this.prisma.workoutGroupUser.findMany({
      where: { studentId },
      select: { groupId: true },
    });
    if (!memberships.length) return;
    const groupIds = memberships.map((m) => m.groupId);
    const events = await this.prisma.groupEvent.findMany({
      where: {
        groupId: { in: groupIds },
        startsAt: { lte: completedAt },
        endsAt: { gte: completedAt },
      },
      select: { id: true },
    });
    for (const e of events) {
      await this.prisma.groupEventScore.upsert({
        where: { eventId_studentId: { eventId: e.id, studentId } },
        create: { eventId: e.id, studentId, workoutCount: 1 },
        update: { workoutCount: { increment: 1 } },
      });
    }
  }

  private validatePrizeTiers(tiers: PrizeTierInput[]) {
    if (!tiers?.length) throw new BadRequestException("Defina ao menos uma faixa de premiação (ex.: 1.º, 2.º lugar).");
    const places = new Set<number>();
    for (const t of tiers) {
      if (!Number.isInteger(t.place) || t.place < 1) throw new BadRequestException("Cada lugar deve ser um inteiro ≥ 1.");
      if (places.has(t.place)) throw new BadRequestException(`Lugar ${t.place} repetido.`);
      places.add(t.place);
      if (!t.prizeLabel?.trim()) throw new BadRequestException("Cada faixa precisa de descrição do prêmio.");
    }
  }

  async createEvent(
    trainerId: string,
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
    const group = await this.prisma.workoutGroup.findFirst({
      where: { id: body.groupId, trainerId },
    });
    if (!group) throw new NotFoundException("Grupo não encontrado.");
    const startsAt = new Date(body.startsAt);
    const endsAt = new Date(body.endsAt);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      throw new BadRequestException("Datas inválidas.");
    }
    if (endsAt <= startsAt) throw new BadRequestException("A data limite deve ser depois do início.");
    this.validatePrizeTiers(body.prizeTiers);

    return this.prisma.groupEvent.create({
      data: {
        groupId: body.groupId,
        trainerId,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        prizeNote: body.prizeNote?.trim() || null,
        startsAt,
        endsAt,
        metric: GroupEventMetric.WORKOUT_COMPLETIONS,
        prizeTiers: {
          create: body.prizeTiers.map((t) => ({
            place: t.place,
            prizeLabel: t.prizeLabel.trim(),
          })),
        },
      },
      include: { prizeTiers: { orderBy: { place: "asc" } }, group: { select: { id: true, name: true } } },
    });
  }

  async listForTrainer(trainerId: string) {
    const rows = await this.prisma.groupEvent.findMany({
      where: { trainerId },
      orderBy: { endsAt: "desc" },
      include: {
        group: { select: { id: true, name: true } },
        prizeTiers: { orderBy: { place: "asc" } },
        _count: { select: { scores: true } },
      },
    });
    return rows.map((ev) => ({
      ...ev,
      status: this.eventStatus(ev.endsAt, ev.startsAt),
    }));
  }

  async getEventForTrainer(eventId: string, trainerId: string) {
    const ev = await this.prisma.groupEvent.findFirst({
      where: { id: eventId, trainerId },
      include: {
        group: { select: { id: true, name: true } },
        prizeTiers: { orderBy: { place: "asc" } },
      },
    });
    if (!ev) throw new NotFoundException("Evento não encontrado.");
    return {
      event: { ...ev, status: this.eventStatus(ev.endsAt, ev.startsAt) },
      leaderboard: await this.buildLeaderboard(ev.id, ev.groupId, ev.prizeTiers),
    };
  }

  async deleteEvent(eventId: string, trainerId: string) {
    const ev = await this.prisma.groupEvent.findFirst({ where: { id: eventId, trainerId } });
    if (!ev) throw new NotFoundException("Evento não encontrado.");
    await this.prisma.groupEvent.delete({ where: { id: eventId } });
    return { ok: true };
  }

  async listForStudent(studentId: string) {
    const memberships = await this.prisma.workoutGroupUser.findMany({
      where: { studentId },
      select: { groupId: true },
    });
    if (!memberships.length) return [];
    const groupIds = memberships.map((m) => m.groupId);
    const rows = await this.prisma.groupEvent.findMany({
      where: { groupId: { in: groupIds } },
      orderBy: { endsAt: "desc" },
      include: {
        group: { select: { id: true, name: true } },
        prizeTiers: { orderBy: { place: "asc" } },
      },
    });
    return rows.map((ev) => ({
      ...ev,
      status: this.eventStatus(ev.endsAt, ev.startsAt),
    }));
  }

  async getEventForStudent(eventId: string, studentId: string) {
    const ev = await this.prisma.groupEvent.findFirst({
      where: { id: eventId },
      include: {
        group: { select: { id: true, name: true } },
        prizeTiers: { orderBy: { place: "asc" } },
      },
    });
    if (!ev) throw new NotFoundException("Evento não encontrado.");
    const member = await this.prisma.workoutGroupUser.findUnique({
      where: { groupId_studentId: { groupId: ev.groupId, studentId } },
    });
    if (!member) throw new ForbiddenException("Você não participa deste grupo.");
    const leaderboard = await this.buildLeaderboard(ev.id, ev.groupId, ev.prizeTiers);
    const myRow = leaderboard.find((r) => r.studentId === studentId);
    return {
      event: { ...ev, status: this.eventStatus(ev.endsAt, ev.startsAt) },
      leaderboard,
      my: myRow ?? null,
    };
  }

  private async buildLeaderboard(
    eventId: string,
    groupId: string,
    prizeTiers: { place: number; prizeLabel: string }[],
  ): Promise<
    {
      rank: number;
      studentId: string;
      name: string;
      workoutCount: number;
      prizeLabel: string | null;
    }[]
  > {
    const members = await this.prisma.workoutGroupUser.findMany({
      where: { groupId },
      include: { student: { select: { id: true, name: true } } },
    });
    const scores = await this.prisma.groupEventScore.findMany({
      where: { eventId },
    });
    const countByStudent = new Map(scores.map((s) => [s.studentId, s.workoutCount]));
    const tierByPlace = new Map(prizeTiers.map((t) => [t.place, t.prizeLabel]));
    const rows = members.map((m) => ({
      studentId: m.studentId,
      name: m.student.name,
      workoutCount: countByStudent.get(m.studentId) ?? 0,
    }));
    rows.sort((a, b) =>
      b.workoutCount !== a.workoutCount
        ? b.workoutCount - a.workoutCount
        : a.studentId.localeCompare(b.studentId),
    );
    return rows.map((r, i) => ({
      rank: i + 1,
      studentId: r.studentId,
      name: r.name,
      workoutCount: r.workoutCount,
      prizeLabel: tierByPlace.get(i + 1) ?? null,
    }));
  }

  eventStatus(endsAt: Date, startsAt: Date): "upcoming" | "active" | "ended" {
    const now = Date.now();
    if (now < startsAt.getTime()) return "upcoming";
    if (now > endsAt.getTime()) return "ended";
    return "active";
  }
}
