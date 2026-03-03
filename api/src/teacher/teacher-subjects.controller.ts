import { Controller, Get, Param, Request, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { getUserId } from "../common/get-user-id";
import { CoursesService } from "../courses/courses.service";

@ApiTags("teacher-subjects")
@ApiBearerAuth("access-token")
@Controller("teacher/subjects")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("TEACHER")
export class TeacherSubjectsController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  @ApiOperation({ summary: "Get subjects taught by the authenticated teacher" })
  async findMySubjects(@Request() req: any) {
    const teacherId = getUserId(req);
    return this.coursesService.teacherFindAllSubjects(teacherId);
  }

  // ✅ NOUVEAU: liste des étudiants du cours (via learningModuleId)
  @Get(":courseId/students")
  @ApiOperation({ summary: "Get students enrolled in a teacher's course" })
  async findSubjectStudents(@Request() req: any, @Param("courseId") courseId: string) {
    const teacherId = getUserId(req);
    return this.coursesService.teacherFindSubjectStudents(teacherId, courseId);
  }
}
