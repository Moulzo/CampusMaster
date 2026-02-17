import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { CoursesModule } from './courses/courses.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { AdminUsersModule } from './admin-users/admin-users.module';
import { FilesModule } from './files/files.module';

@Module({
  imports: [
    AuthModule,
    CoursesModule,
    AssignmentsModule,
    SubmissionsModule,
    AdminUsersModule,
    FilesModule,
    ConfigModule.forRoot({ isGlobal: true }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
