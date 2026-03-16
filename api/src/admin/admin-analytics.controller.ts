import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
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

  // ✅ NOUVEAU - Activité hebdomadaire
  @Get('weekly-activity')
  @ApiOperation({ summary: 'Get weekly activity analytics' })
  @ApiQuery({ name: 'semesterId', required: false, type: String })
  @ApiQuery({ name: 'moduleId', required: false, type: String })
  getWeeklyActivity(
    @Query('semesterId') semesterId?: string,
    @Query('moduleId') moduleId?: string,
  ) {
    return this.adminAnalyticsService.getWeeklyActivity({ semesterId, moduleId });
  }

  // ✅ NOUVEAU - KPI configurables
  @Get('configurable-kpis')
  getConfigurableKpis() {
    return this.adminAnalyticsService.getConfigurableKpis();
  }

  // ✅ NOUVEAU - Activité hebdomadaire des téléchargements
  @Get('weekly-downloads')
  @ApiOperation({ summary: 'Get weekly downloads analytics' })
  @ApiQuery({ name: 'semesterId', required: false, type: String })
  @ApiQuery({ name: 'moduleId', required: false, type: String })
  getWeeklyDownloads(
    @Query('semesterId') semesterId?: string,
    @Query('moduleId') moduleId?: string,
  ) {
    return this.adminAnalyticsService.getWeeklyDownloads({ semesterId, moduleId });
  }

  @Get('weekly-views')
  @ApiOperation({ summary: 'Get weekly views analytics' })
  @ApiQuery({ name: 'semesterId', required: false, type: String })
  @ApiQuery({ name: 'moduleId', required: false, type: String })
  getWeeklyViews(
    @Query('semesterId') semesterId?: string,
    @Query('moduleId') moduleId?: string,
  ) {
    return this.adminAnalyticsService.getWeeklyViews({ semesterId, moduleId });
  }
}
