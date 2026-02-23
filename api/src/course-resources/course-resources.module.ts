import { Module } from '@nestjs/common';
import { CourseResourcesController } from './course-resources.controller';
import { CourseResourcesService } from './course-resources.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CourseResourcesController],
  providers: [CourseResourcesService],
})
export class CourseResourcesModule {}
