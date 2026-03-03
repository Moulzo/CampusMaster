import { Controller, Get, UseGuards, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CoursesService } from "../courses/courses.service";

@ApiTags("student-subjects")
@ApiBearerAuth("access-token")
@Controller("student/subjects")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("STUDENT")
export class StudentSubjectsController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  @ApiOperation({ summary: "Get my subjects (by my learning module)" })
  async getMySubjects(@Req() req: any) {
    const userId = req.user?.id as string;
    return this.coursesService.studentFindMySubjects(userId);
  }
}
