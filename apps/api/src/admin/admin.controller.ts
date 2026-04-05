import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { Role } from "@prisma/client";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { PrismaService } from "../prisma/prisma.service";

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private prisma: PrismaService) {}

  @Get("users")
  users() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  @Post("links/trainer-student")
  linkTrainer(@Body() body: { trainerId: string; studentId: string }) {
    return this.prisma.trainerStudentLink.upsert({
      where: { trainerId_studentId: { trainerId: body.trainerId, studentId: body.studentId } },
      create: { trainerId: body.trainerId, studentId: body.studentId },
      update: {},
    });
  }

  @Post("links/nutritionist-student")
  linkNutri(@Body() body: { nutritionistId: string; studentId: string }) {
    return this.prisma.nutritionistStudentLink.upsert({
      where: { nutritionistId_studentId: { nutritionistId: body.nutritionistId, studentId: body.studentId } },
      create: { nutritionistId: body.nutritionistId, studentId: body.studentId },
      update: {},
    });
  }

  @Patch("settings/:key")
  setting(@Param("key") key: string, @Body() body: { value: unknown }) {
    return this.prisma.adminSetting.upsert({
      where: { key },
      create: { key, value: body.value as object },
      update: { value: body.value as object },
    });
  }
}
