import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
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
import { DiscussionsModule } from './discussions/discussions.module';
import { PrivateMessagesModule } from './private-messages/private-messages.module';
import { TicketsModule } from './tickets/tickets.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),

    // ✅ Rate limiting global
    // Règles (cumulatives) :
    //   - "short"  : max 20 requêtes / 1 seconde   → protection burst
    //   - "medium" : max 100 requêtes / 10 secondes → protection spam
    //   - "long"   : max 500 requêtes / 1 minute    → protection DDoS léger
    ThrottlerModule.forRoot([
      { name: 'short',  ttl: 1000,  limit: 20  },
      { name: 'medium', ttl: 10000, limit: 100 },
      { name: 'long',   ttl: 60000, limit: 500 },
    ]),

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
    DiscussionsModule,
    PrivateMessagesModule,
    TicketsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // ✅ Applique ThrottlerGuard globalement sur toutes les routes
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}