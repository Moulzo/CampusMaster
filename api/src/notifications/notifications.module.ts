import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { TestNotificationsController } from './test-notifications.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { WebSocketsModule } from '../websockets/websockets.module';
import { DeadlineReminderService } from './deadline-reminder.service';

@Module({
  imports: [PrismaModule, WebSocketsModule],
  providers: [NotificationsService, DeadlineReminderService],
  controllers: [NotificationsController, TestNotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
