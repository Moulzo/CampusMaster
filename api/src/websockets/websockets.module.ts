import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { WebSocketService } from './websocket-simple.service';
import { NotificationsGateway } from './notifications.gateway';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET || 'dev_access_secret',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  providers: [WebSocketService, NotificationsGateway],
  exports: [WebSocketService, NotificationsGateway, JwtModule],
})
export class WebSocketsModule {}
