import { Module } from "@nestjs/common";
import { NutritionistController } from "./nutritionist.controller";

@Module({
  controllers: [NutritionistController],
})
export class NutritionistModule {}
