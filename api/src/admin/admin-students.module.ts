import { Module } from '@nestjs/common';
import { AdminStudentsController } from './admin-students.controller';
import { AdminStudentsService } from './admin-students.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AdminStudentsController],
  providers: [AdminStudentsService],
})
export class AdminStudentsModule {}
