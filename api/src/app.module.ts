import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { CoursesModule } from './courses/courses.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { AdminUsersModule } from './admin-users/admin-users.module';
import { FilesModule } from './files/files.module';
import { NotificationsModule } from './notifications/notifications.module';
import { WebSocketsModule } from './websockets/websockets.module';
import { CourseResourcesModule } from './course-resources/course-resources.module';
import { SemestersModule } from './semesters/semesters.module';
import { AdminModule } from './admin/admin.module';
import { AcademicsModule } from './academics/academics.module';
import { StudentModule } from './student/student.module';
import { TeacherModule } from './teacher/teacher.module';
import { AnnouncementsModule } from './announcements/announcements.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    AuthModule,
    CoursesModule,
    AssignmentsModule,
    SubmissionsModule,
    AdminUsersModule,
    FilesModule,
    NotificationsModule,
    WebSocketsModule,
    CourseResourcesModule,
    SemestersModule,
    AdminModule,
    AcademicsModule,
    StudentModule,
    TeacherModule,
    AnnouncementsModule,
    ConfigModule.forRoot({ isGlobal: true }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
