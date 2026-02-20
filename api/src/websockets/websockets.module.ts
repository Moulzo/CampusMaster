import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { WebSocketService } from './websocket-simple.service';
import { NotificationsGateway } from './notifications.gateway';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET || 'dev_access_secret',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  providers: [WebSocketService, NotificationsGateway],
  exports: [WebSocketService, JwtModule],
})
export class WebSocketsModule {}
