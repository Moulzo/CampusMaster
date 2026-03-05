import { Controller, Get, Query, UseGuards, Req } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { StudentResultsService } from "./student-results.service";

@Controller("student")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("STUDENT")
export class StudentController {
  constructor(private readonly results: StudentResultsService) {}

  @Get("semester-results")
  async getSemesterResults(@Req() req: any, @Query("semesterId") semesterId?: string) {
    return this.results.getSemesterResults(req.user.id, semesterId);
  }
}
