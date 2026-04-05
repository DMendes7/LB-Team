import { Module } from "@nestjs/common";
import { OnboardingController } from "./onboarding.controller";
import { StudentLinksModule } from "../student-links/student-links.module";

@Module({
  imports: [StudentLinksModule],
  controllers: [OnboardingController],
})
export class OnboardingModule {}
