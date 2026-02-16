import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { RolesGuard } from './roles.guard';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}), // on signera dans le service
    PrismaModule,
  ],
  providers: [AuthService, JwtStrategy, RolesGuard],
  controllers: [AuthController],
})
export class AuthModule {}
