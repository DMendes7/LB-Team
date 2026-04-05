import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Role } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Garante vínculo TrainerStudentLink / NutritionistStudentLink para alunas novas.
 * Personal padrão: DEFAULT_TRAINER_EMAIL ou primeiro TRAINER do sistema.
 */
@Injectable()
export class StudentLinksService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async ensureDefaultProfessionalLinks(studentUserId: string): Promise<void> {
    const trainerId = await this.resolveTrainerId();
    const nutritionistId = await this.resolveNutritionistId();

    if (trainerId) {
      await this.prisma.trainerStudentLink.upsert({
        where: { trainerId_studentId: { trainerId, studentId: studentUserId } },
        create: { trainerId, studentId: studentUserId },
        update: {},
      });
    }

    if (nutritionistId) {
      await this.prisma.nutritionistStudentLink.upsert({
        where: { nutritionistId_studentId: { nutritionistId, studentId: studentUserId } },
        create: { nutritionistId, studentId: studentUserId },
        update: {},
      });
    }
  }

  private async resolveTrainerId(): Promise<string | null> {
    const email = this.config.get<string>("DEFAULT_TRAINER_EMAIL")?.trim();
    if (email) {
      const u = await this.prisma.user.findUnique({ where: { email } });
      if (u?.role === Role.TRAINER) return u.id;
    }
    const first = await this.prisma.user.findFirst({
      where: { role: Role.TRAINER },
      orderBy: { createdAt: "asc" },
    });
    return first?.id ?? null;
  }

  private async resolveNutritionistId(): Promise<string | null> {
    const email = this.config.get<string>("DEFAULT_NUTRITIONIST_EMAIL")?.trim();
    if (email) {
      const u = await this.prisma.user.findUnique({ where: { email } });
      if (u?.role === Role.NUTRITIONIST) return u.id;
    }
    const first = await this.prisma.user.findFirst({
      where: { role: Role.NUTRITIONIST },
      orderBy: { createdAt: "asc" },
    });
    return first?.id ?? null;
  }
}
