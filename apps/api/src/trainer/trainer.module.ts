import { Module } from "@nestjs/common";
import { TrainerController } from "./trainer.controller";
import { GamificationModule } from "../gamification/gamification.module";

@Module({
  imports: [GamificationModule],
  controllers: [TrainerController],
})
export class TrainerModule {}
