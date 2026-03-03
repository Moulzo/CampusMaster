import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { CoursesService } from "../courses/courses.service";
import { TeacherSubjectsController } from "./teacher-subjects.controller";

@Module({
  imports: [PrismaModule],
  controllers: [TeacherSubjectsController],
  providers: [CoursesService],
})
export class TeacherModule {}
