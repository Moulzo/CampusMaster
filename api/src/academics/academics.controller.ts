import { Controller, Get, UseGuards, Header } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('academics')
@ApiBearerAuth('access-token')
@Controller('academics')
@UseGuards(JwtAuthGuard)
export class AcademicsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('tree')
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  async tree() {
    return this.prisma.semester.findMany({
      orderBy: { name: 'asc' },
      include: {
        learningModules: {
          orderBy: { name: 'asc' },
          include: {
            subjects: {
              orderBy: { createdAt: 'desc' },
              include: {
                teacher: { select: { id: true, fullName: true, email: true } },
              },
            },
          },
        },
      },
    });
  }
}
