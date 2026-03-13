import { Controller, Get, Param, Put, UseGuards, Body, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AdminStudentsService } from './admin-students.service';
import { UpdateStudentModuleDto } from './dto/admin-student.dto';
import { SetStudentModuleDto } from './dto/set-student-module.dto';

@ApiTags('admin-students')
@ApiBearerAuth('access-token')
@Controller('admin/students')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminStudentsController {
  constructor(private readonly adminStudentsService: AdminStudentsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all students with filters' })
  @ApiQuery({ name: 'moduleId', required: false, type: String })
  @ApiQuery({ name: 'q', required: false, type: String })
  async findAll(
    @Query('moduleId') moduleId?: string,
    @Query('q') q?: string,
  ) {
    return this.adminStudentsService.findAll({ moduleId, q });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get student by ID' })
  async findOne(@Param('id') id: string) {
    return this.adminStudentsService.findOne(id);
  }

  @Get(':id/analytics')
  @ApiOperation({ summary: 'Get student analytics' })
  async getAnalytics(@Param('id') id: string) {
    return this.adminStudentsService.getStudentAnalytics(id);
  }

  @Put(':id/module')
  @ApiOperation({ summary: 'Assign student to a learning module' })
  async setModule(
    @Param('id') id: string,
    @Body() dto: SetStudentModuleDto,
  ) {
    // ✅ on accepte null (désaffecter)
    // ❌ on refuse undefined (champ manquant)
    if (dto.learningModuleId === undefined) {
      throw new BadRequestException('learningModuleId is required');
    }
    return this.adminStudentsService.setModule(id, dto.learningModuleId);
  }

  @Put(':id/unset-module')
  @ApiOperation({ summary: 'Remove student from learning module' })
  async unsetModule(@Param('id') id: string) {
    return this.adminStudentsService.unsetModule(id);
  }
}
