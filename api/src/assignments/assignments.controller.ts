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
  Query,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@ApiBearerAuth('access-token')
@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TEACHER')
  create(@Body() dto: CreateAssignmentDto, @Request() req: any) {
    const teacherId = req.user.id ?? req.user.sub;
    return this.assignmentsService.create(dto, teacherId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Request() req: any, @Query('courseId') courseId?: string) {
    const userId = req.user.id ?? req.user.sub;
    const role = req.user.role;
    return this.assignmentsService.findAll(userId, role, courseId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.id ?? req.user.sub;
    const role = req.user.role;
    return this.assignmentsService.findOne(id, userId, role);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TEACHER')
  update(@Param('id') id: string, @Body() dto: UpdateAssignmentDto, @Request() req: any) {
    const teacherId = req.user.id ?? req.user.sub;
    return this.assignmentsService.update(id, dto, teacherId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TEACHER')
  remove(@Param('id') id: string, @Request() req: any) {
    const teacherId = req.user.id ?? req.user.sub;
    return this.assignmentsService.remove(id, teacherId);
  }
}
