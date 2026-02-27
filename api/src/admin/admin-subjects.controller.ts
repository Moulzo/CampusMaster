import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth, ApiBody, ApiConsumes } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CreateSubjectDto, UpdateSubjectDto } from "./dto/admin-subject.dto";
import { SetTeachersDto } from "./dto/set-teachers.dto";
import { CoursesService } from "../courses/courses.service";

@ApiTags("admin-subjects")
@ApiBearerAuth('access-token') // ✅ IMPORTANT pour que Swagger envoie Authorization
@Controller("admin/subjects")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
export class AdminSubjectsController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  @ApiOperation({ summary: "Get all subjects with filters" })
  @ApiQuery({ name: 'moduleId', required: false, type: String })
  @ApiQuery({ name: 'teacherId', required: false, type: String })
  async findAll(@Query('moduleId') moduleId?: string, @Query('teacherId') teacherId?: string) {
    // Pour l'instant, on utilise findAll existant et on filtre côté service si besoin
    // TODO: créer une méthode adminFindAll avec filtres
    const courses = await this.coursesService.findAll('admin', 'ADMIN');
    
    let filtered = courses;
    if (moduleId) {
      filtered = filtered.filter(course => course.learningModuleId === moduleId);
    }
    if (teacherId) {
      filtered = filtered.filter(course => 
        course.teacherId === teacherId || 
        course.teachers?.some(teacher => teacher.id === teacherId)
      );
    }
    
    return filtered;
  }

  @Get(':id')
  @ApiOperation({ summary: "Get subject by ID" })
  async findOne(@Param('id') id: string) {
    return this.coursesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: "Create subject (course)" })
  create(@Body() dto: CreateSubjectDto) {
    return this.coursesService.adminCreateSubject(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: "Update subject (course)" })
  update(@Param('id') id: string, @Body() dto: UpdateSubjectDto) {
    return this.coursesService.adminUpdateSubject(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: "Delete subject (course)" })
  remove(@Param('id') id: string) {
    return this.coursesService.adminDeleteSubject(id);
  }

  // ✅ set complet (recommandé)
  @Put(':id/teachers')
  @ApiOperation({ summary: "Set teachers for a subject (replace list)" })
  @ApiBody({ type: SetTeachersDto }) // ✅ Swagger affiche un JSON
  @ApiConsumes("application/json")
  setTeachers(@Param('id') id: string, @Body() dto: SetTeachersDto) {
    return this.coursesService.adminSetTeachers(id, dto.teacherIds ?? []);
  }

  @Delete(':id/teachers/:teacherId')
  @ApiOperation({ summary: "Remove one teacher from a subject" })
  removeTeacher(@Param('id') id: string, @Param('teacherId') teacherId: string) {
    return this.coursesService.adminRemoveTeacher(id, teacherId);
  }
}
