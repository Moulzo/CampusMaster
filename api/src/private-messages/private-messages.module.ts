import { Module } from '@nestjs/common';
import { PrivateMessagesController } from './private-messages.controller';
import { PrivateMessagesService } from './private-messages.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PrivateMessagesController],
  providers: [PrivateMessagesService],
  exports: [PrivateMessagesService],
})
export class PrivateMessagesModule {}
