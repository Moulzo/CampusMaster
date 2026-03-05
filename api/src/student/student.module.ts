import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { CoursesService } from "../courses/courses.service";
import { StudentSubjectsController } from "./student-subjects.controller";
import { StudentController } from "./student.controller";
import { StudentResultsService } from "./student-results.service";

@Module({
  imports: [PrismaModule],
  controllers: [StudentSubjectsController, StudentController],
  providers: [CoursesService, StudentResultsService],
})
export class StudentModule {}
