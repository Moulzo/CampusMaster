import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  UseGuards,
  Header,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SetSubjectModuleDto } from '../modules/dto/learning-module.dto';

@ApiTags('admin-subjects')
@ApiBearerAuth('access-token')
@Controller('admin/subjects')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminSubjectsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  list() {
    return this.prisma.course.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        teacher: { select: { id: true, email: true, fullName: true } },
        learningModule: {
          include: { semester: true },
        },
      },
    });
  }

  @Put(':courseId/module')
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  async setModule(
    @Param('courseId') courseId: string,
    @Body() setSubjectModuleDto: SetSubjectModuleDto,
  ) {
    // Vérifier que le cours existe
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new BadRequestException('Course not found');
    }

    // Vérifier que le module existe
    const module = await this.prisma.learningModule.findUnique({
      where: { id: setSubjectModuleDto.learningModuleId },
    });

    if (!module) {
      throw new BadRequestException('Learning module not found');
    }

    return this.prisma.course.update({
      where: { id: courseId },
      data: { learningModuleId: setSubjectModuleDto.learningModuleId },
      include: {
        learningModule: true,
        teacher: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
  }

  @Put(':courseId/unset-module')
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  async unsetModule(@Param('courseId') courseId: string) {
    // Vérifier que le cours existe
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new BadRequestException('Course not found');
    }

    return this.prisma.course.update({
      where: { id: courseId },
      data: { learningModuleId: null },
      include: {
        teacher: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
  }
}
