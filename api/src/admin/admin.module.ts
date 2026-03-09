import { Module } from '@nestjs/common';
import { AdminSemestersController } from './admin-semesters.controller';
import { AdminLearningModulesController } from './admin-learning-modules.controller';
import { AdminSubjectsController } from './admin-subjects.controller';
import { AdminStudentsController } from './admin-students.controller';
import { AdminStudentsService } from './admin-students.service';
import { AdminStudentsModule } from './admin-students.module';
import { AdminAnalyticsController } from './admin-analytics.controller';
import { AdminAnalyticsService } from './admin-analytics.service';
import { SemestersService } from '../semesters/semesters.service';
import { LearningModulesService } from '../modules/modules.service';
import { CoursesService } from '../courses/courses.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, AdminStudentsModule],
  controllers: [
    AdminSemestersController,
    AdminLearningModulesController,
    AdminSubjectsController,
    AdminStudentsController,
    AdminAnalyticsController,
  ],
  providers: [
    SemestersService,
    LearningModulesService,
    CoursesService,
    AdminStudentsService,
    AdminAnalyticsService,
  ],
})
export class AdminModule {}
