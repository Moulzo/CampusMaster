import { Module } from '@nestjs/common';
import { AcademicsController } from './academics.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AcademicsController],
})
export class AcademicsModule {}
