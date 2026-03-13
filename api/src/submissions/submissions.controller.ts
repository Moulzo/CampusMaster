import {
  Controller,
  Get,
  Post,
  Body,
  BadRequestException,
  Param,
  UseGuards,
  Request,
  Query,
  NotFoundException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { SubmissionsService } from './submissions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';

@ApiBearerAuth('access-token')
@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateSubmissionDto, @Request() req: any) {
    if (!dto?.assignmentId) {
      throw new BadRequestException('assignmentId is required');
    }
    const studentId = req.user.id ?? req.user.sub;
    return this.submissionsService.create(dto.assignmentId, studentId, dto.fileUrl);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findByAssignment(@Query('assignmentId') assignmentId: string, @Request() req: any) {
    const userId = req.user.id ?? req.user.sub;
    const role = req.user.role;
    return this.submissionsService.findByAssignment(assignmentId, userId, role);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.id ?? req.user.sub;
    const role = req.user.role;
    return this.submissionsService.findOne(id, userId, role);
  }

  @Post(':id/grade')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UsePipes(new ValidationPipe())
  @Roles('TEACHER')
  grade(
    @Param('id') id: string, 
    @Body() dto: GradeSubmissionDto, 
    @Request() req: any
  ) {
    if (dto?.score === undefined || dto?.score === null) {
      throw new BadRequestException('score is required');
    }
    const teacherId = req.user.id ?? req.user.sub;

    return this.submissionsService.grade(id, dto.score, teacherId, dto.feedback); // ✅ return
  }

  @Post('assignment/:assignmentId/student/:studentId/grade')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UsePipes(new ValidationPipe())
  @Roles('TEACHER')
  async gradeWithoutSubmission(
    @Param('assignmentId') assignmentId: string,
    @Param('studentId') studentId: string,
    @Body() dto: GradeSubmissionDto,
    @Request() req: any,
  ) {
    if (dto?.score === undefined || dto?.score === null) {
      throw new BadRequestException('score is required');
    }
    const teacherId = req.user.id ?? req.user.sub;
    
    return this.submissionsService.upsertAndGrade({
      assignmentId,
      studentId,
      teacherId,
      score: dto.score,
      feedback: dto.feedback,
    });
  }
}
