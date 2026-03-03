import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { CoursesService } from "../courses/courses.service";
import { StudentSubjectsController } from "./student-subjects.controller";

@Module({
  imports: [PrismaModule],
  controllers: [StudentSubjectsController],
  providers: [CoursesService],
})
export class StudentModule {}
