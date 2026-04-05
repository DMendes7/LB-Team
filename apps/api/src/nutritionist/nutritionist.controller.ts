import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { Role, StudentGoal } from "@prisma/client";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, JwtUser } from "../common/decorators/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";

@Controller("nutritionist")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.NUTRITIONIST, Role.ADMIN)
export class NutritionistController {
  constructor(private prisma: PrismaService) {}

  @Get("dashboard")
  async dashboard(@CurrentUser() u: JwtUser) {
    const patients = await this.prisma.nutritionistStudentLink.count({ where: { nutritionistId: u.sub } });
    const groups = await this.prisma.nutritionGroup.findMany({
      where: { nutritionistId: u.sub },
      include: { _count: { select: { members: true } }, template: true },
    });
    const logs = await this.prisma.nutritionLog.groupBy({
      by: ["studentId"],
      _count: true,
      where: { createdAt: { gte: new Date(Date.now() - 14 * 86400000) } },
    });
    const lowAdhesion = logs.filter((l) => l._count < 2).length;
    return { patients, groups, lowAdhesionHint: lowAdhesion };
  }

  @Get("templates")
  templates(@CurrentUser() u: JwtUser) {
    return this.prisma.nutritionTemplate.findMany({
      where: { authorId: u.sub },
      include: { meals: { orderBy: { orderIndex: "asc" } } },
      orderBy: { title: "asc" },
    });
  }

  @Get("groups")
  groups(@CurrentUser() u: JwtUser) {
    return this.prisma.nutritionGroup.findMany({
      where: { nutritionistId: u.sub },
      include: { _count: { select: { members: true } }, template: true },
      orderBy: { name: "asc" },
    });
  }

  @Get("patients")
  patients(@CurrentUser() u: JwtUser) {
    return this.prisma.nutritionistStudentLink.findMany({
      where: { nutritionistId: u.sub },
      include: {
        student: {
          include: {
            profile: true,
            studentProfile: { include: { nutritionOverride: true } },
            nutritionGroupMemberships: {
              where: { group: { nutritionistId: u.sub } },
              include: { group: { include: { template: true } } },
            },
          },
        },
      },
    });
  }

  @Get("patients/:id")
  async patientDetail(@CurrentUser() u: JwtUser, @Param("id") id: string) {
    const link = await this.prisma.nutritionistStudentLink.findUnique({
      where: { nutritionistId_studentId: { nutritionistId: u.sub, studentId: id } },
      include: {
        student: {
          include: {
            profile: true,
            studentProfile: {
              include: {
                nutritionOverride: { include: { template: { include: { meals: { orderBy: { orderIndex: "asc" } } } } } },
              },
            },
            nutritionGroupMemberships: {
              where: { group: { nutritionistId: u.sub } },
              include: { group: { include: { template: true } } },
            },
          },
        },
      },
    });
    if (!link) throw new NotFoundException();

    const ov = link.student.studentProfile?.nutritionOverride;
    const templateFromOverride =
      ov?.template && ov.template.authorId === u.sub ? ov.template : null;
    const gm = link.student.nutritionGroupMemberships[0];
    const templateFromGroup = gm?.group.template ?? null;

    const dietAssignment: {
      kind: "override" | "group" | "none";
      template: { id: string; title: string } | null;
      groupName: string | null;
    } = templateFromOverride
      ? { kind: "override", template: { id: templateFromOverride.id, title: templateFromOverride.title }, groupName: null }
      : templateFromGroup
        ? {
            kind: "group",
            template: { id: templateFromGroup.id, title: templateFromGroup.title },
            groupName: gm?.group.name ?? null,
          }
        : { kind: "none", template: null, groupName: null };

    return { ...link, insights: { dietAssignment } };
  }

  @Post("templates")
  createTemplate(
    @CurrentUser() u: JwtUser,
    @Body()
    body: {
      title: string;
      objective?: StudentGoal;
      summary?: string;
      guidelines?: string;
      practicalTips?: string;
      meals?: { name: string; description?: string; substitutions?: string; orderIndex: number }[];
    },
  ) {
    return this.prisma.nutritionTemplate.create({
      data: {
        authorId: u.sub,
        title: body.title,
        objective: body.objective,
        summary: body.summary,
        guidelines: body.guidelines,
        practicalTips: body.practicalTips,
        meals: body.meals?.length ? { create: body.meals.map((m) => ({ ...m })) } : undefined,
      },
      include: { meals: true },
    });
  }

  @Post("groups")
  async createGroup(
    @CurrentUser() u: JwtUser,
    @Body() body: { name: string; description?: string; templateId: string },
  ) {
    const tpl = await this.prisma.nutritionTemplate.findFirst({
      where: { id: body.templateId, authorId: u.sub },
    });
    if (!tpl) throw new NotFoundException("Plano não encontrado.");
    return this.prisma.nutritionGroup.create({
      data: {
        nutritionistId: u.sub,
        name: body.name,
        description: body.description,
        templateId: body.templateId,
      },
    });
  }

  @Post("groups/:groupId/members")
  async addMembers(
    @CurrentUser() u: JwtUser,
    @Param("groupId") groupId: string,
    @Body() body: { studentIds: string[] },
  ) {
    const group = await this.prisma.nutritionGroup.findFirst({
      where: { id: groupId, nutritionistId: u.sub },
    });
    if (!group) throw new NotFoundException("Grupo não encontrado.");

    for (const studentId of body.studentIds ?? []) {
      const sl = await this.prisma.nutritionistStudentLink.findUnique({
        where: { nutritionistId_studentId: { nutritionistId: u.sub, studentId } },
      });
      if (!sl) throw new ForbiddenException(`Paciente não vinculado: ${studentId}`);
    }

    return this.prisma.$transaction(
      (body.studentIds ?? []).map((studentId) =>
        this.prisma.nutritionGroupUser.upsert({
          where: { groupId_studentId: { groupId, studentId } },
          create: { groupId, studentId },
          update: {},
        }),
      ),
    );
  }

  @Post("patients/:id/override")
  async setOverride(
    @CurrentUser() u: JwtUser,
    @Param("id") id: string,
    @Body() body: { templateId: string },
  ) {
    const link = await this.prisma.nutritionistStudentLink.findUnique({
      where: { nutritionistId_studentId: { nutritionistId: u.sub, studentId: id } },
    });
    if (!link) throw new NotFoundException();
    const tpl = await this.prisma.nutritionTemplate.findFirst({
      where: { id: body.templateId, authorId: u.sub },
    });
    if (!tpl) throw new NotFoundException("Plano não encontrado.");
    return this.prisma.userNutritionOverride.upsert({
      where: { studentId: id },
      create: { studentId: id, templateId: body.templateId },
      update: { templateId: body.templateId },
    });
  }

  @Delete("patients/:id/nutrition-override")
  async clearOverride(@CurrentUser() u: JwtUser, @Param("id") id: string) {
    const link = await this.prisma.nutritionistStudentLink.findUnique({
      where: { nutritionistId_studentId: { nutritionistId: u.sub, studentId: id } },
    });
    if (!link) throw new NotFoundException();
    await this.prisma.userNutritionOverride.deleteMany({ where: { studentId: id } });
    return { ok: true };
  }

  @Post("patients/:id/notes")
  async observation(@CurrentUser() u: JwtUser, @Param("id") id: string, @Body() body: { text: string }) {
    const link = await this.prisma.nutritionistStudentLink.findUnique({
      where: { nutritionistId_studentId: { nutritionistId: u.sub, studentId: id } },
    });
    if (!link) throw new NotFoundException();
    return this.prisma.nutritionLog.create({
      data: { studentId: id, action: "OBSERVATION", meta: { text: body.text } as object },
    });
  }
}
