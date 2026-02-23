import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseGuards,
  Request,
  Header,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { getUserId } from '../common/get-user-id';

@ApiBearerAuth('access-token')
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TEACHER')
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  create(@Body() dto: CreateCourseDto, @Request() req: any) {
    const teacherId = getUserId(req);
    return this.coursesService.create(dto, teacherId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  findAll(@Request() req: any) {
    const userId = getUserId(req);
    const role = req.user.role;
    return this.coursesService.findAll(userId, role);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.coursesService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TEACHER')
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  update(@Param('id') id: string, @Body() dto: UpdateCourseDto, @Request() req: any) {
    const teacherId = getUserId(req);
    return this.coursesService.update(id, dto, teacherId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TEACHER')
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  remove(@Param('id') id: string, @Request() req: any) {
    const teacherId = getUserId(req);
    return this.coursesService.remove(id, teacherId);
  }

  @Post(':id/enroll')
  @UseGuards(JwtAuthGuard)
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  enrollStudent(@Param('id') courseId: string, @Request() req: any) {
    const studentId = getUserId(req);
    return this.coursesService.enrollStudent(courseId, studentId);
  }

  @Post(':id/unenroll')
  @UseGuards(JwtAuthGuard)
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  unenrollStudent(@Param('id') courseId: string, @Request() req: any) {
    const studentId = getUserId(req);
    return this.coursesService.unenrollStudent(courseId, studentId);
  }
}
