import { Module } from "@nestjs/common";
import { StudentLinksService } from "./student-links.service";

@Module({
  providers: [StudentLinksService],
  exports: [StudentLinksService],
})
export class StudentLinksModule {}
