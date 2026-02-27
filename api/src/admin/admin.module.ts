import { Module } from '@nestjs/common';
import { AdminSemestersController } from './admin-semesters.controller';
import { AdminLearningModulesController } from './admin-learning-modules.controller';
import { AdminSubjectsController } from './admin-subjects.controller';
import { SemestersService } from '../semesters/semesters.service';
import { LearningModulesService } from '../modules/modules.service';
import { CoursesService } from '../courses/courses.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [
    AdminSemestersController,
    AdminLearningModulesController,
    AdminSubjectsController,
  ],
  providers: [
    SemestersService,
    LearningModulesService,
    CoursesService,
  ],
})
export class AdminModule {}
