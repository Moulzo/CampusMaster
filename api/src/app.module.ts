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
    ConfigModule.forRoot({ isGlobal: true }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
