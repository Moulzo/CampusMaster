import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/forgot-password.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ✅ Limite renforcée sur le login : 5 tentatives / 60 secondes par IP
  // Protège contre le brute force sur les mots de passe
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Connexion utilisateur' })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  // ✅ Limite renforcée sur le register : 5 créations / 60 secondes par IP
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Inscription utilisateur' })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.email, dto.password, dto.fullName, dto.role);
  }

  // ✅ Limite renforcée sur forgot-password : 3 demandes / 60 secondes par IP
  // Évite l'énumération d'emails et le spam de mails de reset
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @ApiOperation({ summary: 'Demande de réinitialisation de mot de passe' })
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  // ✅ Limite renforcée sur reset-password : 5 tentatives / 60 secondes
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Réinitialisation du mot de passe' })
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  // Refresh token — limite standard (hérite du global)
  @ApiOperation({ summary: 'Rafraîchir le token d\'accès' })
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  // Logout — pas besoin de throttle strict
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Déconnexion' })
  @Post('logout')
  logout(@Request() req: any) {
    return this.authService.logout(req.user.sub);
  }

  // Me — route fréquemment appelée, on skip le throttle
  @SkipThrottle()
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Récupérer le profil connecté' })
  @Get('me')
  getMe(@Request() req: any) {
    return req.user;
  }
}
