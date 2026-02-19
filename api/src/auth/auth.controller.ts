import { Controller, Get, Post, Body, Req, UseGuards, Header } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/forgot-password.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.email, dto.password, dto.fullName, dto.role);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Post('refresh')
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  refresh(@Body() body: RefreshDto) {
    return this.auth.refresh(body.refreshToken);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.token, dto.newPassword);
  }

  @Post('logout')
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  logout(@Body() body: RefreshDto) {
    return this.auth.logout(body.refreshToken);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  me(@Req() req: any) {
    // ✅ req.user contient maintenant { id, email, role }
    return { user: req.user };
  }
}
