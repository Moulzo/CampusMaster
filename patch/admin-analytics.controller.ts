import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminAnalyticsService } from './admin-analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('AdminAnalytics')
@ApiBearerAuth('access-token')
@Controller('admin/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminAnalyticsController {
  constructor(private readonly adminAnalyticsService: AdminAnalyticsService) {}

  @Get('overview')
  getOverview() {
    return this.adminAnalyticsService.getOverview();
  }

  @Get('courses')
  getCourseAnalytics() {
    return this.adminAnalyticsService.getCourseAnalytics();
  }

  // ✅ NOUVEAU
  @Get('grades-evolution')
  getGradesEvolution() {
    return this.adminAnalyticsService.getGradesEvolution();
  }
}
