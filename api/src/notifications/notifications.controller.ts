import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Req,
  UseGuards,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

function getUserIdOrThrow(req: any) {
  const userId = req.user?.id ?? req.user?.sub;
  if (!userId) throw new UnauthorizedException('Missing user id in token');
  return userId;
}

@ApiTags('notifications')
@ApiBearerAuth('access-token')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getNotifications(@Req() req: any, @Query('limit') limit?: string) {
    const userId = getUserIdOrThrow(req);
    const limitNum = limit ? parseInt(limit, 10) : 50;

    const [notifications, unreadCount, total] = await Promise.all([
      this.notificationsService.getUserNotifications(userId, limitNum),
      this.notificationsService.getUnreadCount(userId),
      this.notificationsService.getTotalCount(userId),
    ]);

    return { notifications, unreadCount, total };
  }

  @Get('unread-count')
  async getUnreadCount(@Req() req: any) {
    const userId = getUserIdOrThrow(req);
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  @Put(':id/read')
  async markAsRead(@Req() req: any, @Param('id') id: string) {
    const userId = getUserIdOrThrow(req);
    return this.notificationsService.markAsRead(id, userId);
  }

  @Put('mark-all-read')
  async markAllAsRead(@Req() req: any) {
    const userId = getUserIdOrThrow(req);
    return this.notificationsService.markAllAsRead(userId);
  }

  @Delete(':id')
  async deleteNotification(@Req() req: any, @Param('id') id: string) {
    const userId = getUserIdOrThrow(req);
    return this.notificationsService.deleteNotification(id, userId);
  }
}
