import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { StudentGoal, FitnessLevel, WeeklyFrequencyTarget, Role } from "@prisma/client";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, JwtUser } from "../common/decorators/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { StudentLinksService } from "../student-links/student-links.service";

@Controller("onboarding")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT)
export class OnboardingController {
  constructor(
    private prisma: PrismaService,
    private studentLinks: StudentLinksService,
  ) {}

  @Post()
  async submit(
    @CurrentUser() u: JwtUser,
    @Body()
    body: {
      goal: StudentGoal;
      fitnessLevel: FitnessLevel;
      weeklyTarget: WeeklyFrequencyTarget;
      limitationsNotes?: string;
      dailyTimeMinutes?: number;
      locationHome?: boolean;
      locationGym?: boolean;
      equipmentNotes?: string;
      focusRegions?: string;
      energyCycleNotes?: string;
      preferencesNotes?: string;
      limitations?: { category: string; description: string }[];
      answers?: { key: string; value: string }[];
    },
  ) {
    await this.prisma.physicalLimitation.deleteMany({ where: { studentId: u.sub } });
    await this.prisma.onboardingAnswer.deleteMany({ where: { studentId: u.sub } });

    await this.prisma.studentProfile.upsert({
      where: { userId: u.sub },
      create: {
        userId: u.sub,
        goal: body.goal,
        fitnessLevel: body.fitnessLevel,
        weeklyTarget: body.weeklyTarget,
        limitationsNotes: body.limitationsNotes,
        dailyTimeMinutes: body.dailyTimeMinutes,
        locationHome: body.locationHome,
        locationGym: body.locationGym,
        equipmentNotes: body.equipmentNotes,
        focusRegions: body.focusRegions,
        energyCycleNotes: body.energyCycleNotes,
        preferencesNotes: body.preferencesNotes,
        onboardingCompleted: true,
      },
      update: {
        goal: body.goal,
        fitnessLevel: body.fitnessLevel,
        weeklyTarget: body.weeklyTarget,
        limitationsNotes: body.limitationsNotes,
        dailyTimeMinutes: body.dailyTimeMinutes,
        locationHome: body.locationHome,
        locationGym: body.locationGym,
        equipmentNotes: body.equipmentNotes,
        focusRegions: body.focusRegions,
        energyCycleNotes: body.energyCycleNotes,
        preferencesNotes: body.preferencesNotes,
        onboardingCompleted: true,
      },
    });

    if (body.limitations?.length) {
      await this.prisma.physicalLimitation.createMany({
        data: body.limitations.map((l) => ({
          studentId: u.sub,
          category: l.category,
          description: l.description,
        })),
      });
    }
    if (body.answers?.length) {
      await this.prisma.onboardingAnswer.createMany({
        data: body.answers.map((a) => ({
          studentId: u.sub,
          key: a.key,
          value: a.value,
        })),
      });
    }

    await this.studentLinks.ensureDefaultProfessionalLinks(u.sub);

    return this.prisma.studentProfile.findUnique({
      where: { userId: u.sub },
      include: { physicalLimitations: true, onboardingAnswers: true },
    });
  }
}
