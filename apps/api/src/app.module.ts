import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { OnboardingModule } from "./onboarding/onboarding.module";
import { ExercisesModule } from "./exercises/exercises.module";
import { WorkoutsModule } from "./workouts/workouts.module";
import { NutritionModule } from "./nutrition/nutrition.module";
import { GamificationModule } from "./gamification/gamification.module";
import { StudentModule } from "./student/student.module";
import { TrainerModule } from "./trainer/trainer.module";
import { NutritionistModule } from "./nutritionist/nutritionist.module";
import { AdminModule } from "./admin/admin.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    OnboardingModule,
    ExercisesModule,
    WorkoutsModule,
    NutritionModule,
    GamificationModule,
    StudentModule,
    TrainerModule,
    NutritionistModule,
    AdminModule,
  ],
})
export class AppModule {}
