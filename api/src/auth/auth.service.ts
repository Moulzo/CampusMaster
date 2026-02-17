import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

type Role = 'STUDENT' | 'TEACHER' | 'ADMIN';

@Injectable()
export class AuthService {
  constructor(
    private jwt: JwtService,
    private prisma: PrismaService,
  ) {}

  private get accessSecret() {
    return process.env.JWT_ACCESS_SECRET ?? 'dev_access_secret';
  }

  private get refreshSecret() {
    return process.env.JWT_REFRESH_SECRET ?? 'dev_refresh_secret';
  }

  private async signAccessToken(payload: { sub: string; email: string; role: Role; fullName: string }) {
    const expiresIn = (process.env.JWT_ACCESS_EXPIRES_IN ?? '15m') as any;
    return this.jwt.signAsync(payload, {
      secret: this.accessSecret,
      expiresIn,
    });
  }

  private async signRefreshToken(payload: { sub: string }) {
    const expiresIn = (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d') as any;
    return this.jwt.signAsync(payload, {
      secret: this.refreshSecret,
      expiresIn,
    });
  }

  async register(email: string, password: string, fullName: string, role?: Role) {
    const exists = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (exists) throw new BadRequestException('Email déjà utilisé');

    const normalizedRole: Role = role ?? 'STUDENT';
    if (!['STUDENT', 'TEACHER', 'ADMIN'].includes(normalizedRole)) {
      throw new BadRequestException('Role invalide');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: email.toLowerCase(),
        fullName,
        passwordHash,
        role: normalizedRole,
        refreshTokenHash: null,
      },
    });

    return this.issueTokens(user);
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) throw new UnauthorizedException('Identifiants invalides');

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Identifiants invalides');

    return this.issueTokens(user);
  }

  /**
   * Refresh "clean" :
   * - vérifie la signature du refresh token
   * - vérifie qu'il correspond au refresh "actif" (hash en mémoire)
   * - rotation : réémet un nouveau refresh token et remplace le hash
   */
  async refresh(refreshToken: string) {
    try {
      const decoded = this.jwt.verify(refreshToken, {
        secret: this.refreshSecret,
      }) as { sub: string };

      const user = await this.prisma.user.findUnique({
        where: { id: decoded.sub },
      });

      if (!user) throw new UnauthorizedException('Token invalide');

      if (!user.refreshTokenHash) throw new UnauthorizedException('Token invalide');

      const ok = await bcrypt.compare(refreshToken, user.refreshTokenHash);
      if (!ok) throw new UnauthorizedException('Token invalide');

      // rotation
      return this.issueTokens(user);
    } catch {
      throw new UnauthorizedException('Token invalide');
    }
  }

  /**
   * Logout "clean" :
   * - invalide le refresh token actif (en supprimant le hash)
   * - réponse ok même si token invalide (best-effort)
   */
  async logout(refreshToken: string) {
    try {
      const decoded = this.jwt.verify(refreshToken, {
        secret: this.refreshSecret,
      }) as { sub: string };

      await this.prisma.user.update({
        where: { id: decoded.sub },
        data: { refreshTokenHash: null },
      });
    } catch {
      // ignore : best-effort
    }

    return { ok: true };
  }

  validateAccessPayload(payload: any) {
    return payload;
  }

  /**
   * DEV ONLY: Create seed accounts for testing
   * - 1 ADMIN
   * - 1 TEACHER
   * - 1 STUDENT
   */
  async seed() {
    // Delete existing seed users
    await this.prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'admin@campusmaster.test',
            'teacher@campusmaster.test',
            'student@campusmaster.test',
          ],
        },
      },
    });

    const passwordHash = await bcrypt.hash('Pass1234!', 10);

    const admin = await this.prisma.user.create({
      data: {
        email: 'admin@campusmaster.test',
        fullName: 'Admin User',
        passwordHash,
        role: 'ADMIN',
        refreshTokenHash: null,
      },
    });

    const teacher = await this.prisma.user.create({
      data: {
        email: 'teacher@campusmaster.test',
        fullName: 'Teacher User',
        passwordHash,
        role: 'TEACHER',
        refreshTokenHash: null,
      },
    });

    const student = await this.prisma.user.create({
      data: {
        email: 'student@campusmaster.test',
        fullName: 'Student User',
        passwordHash,
        role: 'STUDENT',
        refreshTokenHash: null,
      },
    });

    return {
      message: 'Seed accounts created successfully',
      accounts: [
        { email: admin.email, role: admin.role, password: 'Pass1234!' },
        { email: teacher.email, role: teacher.role, password: 'Pass1234!' },
        { email: student.email, role: student.role, password: 'Pass1234!' },
      ],
    };
  }

  private async issueTokens(user: any) {
    const accessToken = await this.signAccessToken({
      sub: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role as Role,
    });

    const refreshToken = await this.signRefreshToken({
      sub: user.id,
    });

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash },
    });

    return {
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
      accessToken,
      refreshToken,
    };
  }
}
