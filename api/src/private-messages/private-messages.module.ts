import { Module } from '@nestjs/common';
import { PrivateMessagesController } from './private-messages.controller';
import { PrivateMessagesService } from './private-messages.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WebSocketsModule } from '../websockets/websockets.module';

@Module({
  imports: [PrismaModule, WebSocketsModule],
  controllers: [PrivateMessagesController],
  providers: [PrivateMessagesService],
  exports: [PrivateMessagesService],
})
export class PrivateMessagesModule {}
