import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

type Role = 'STUDENT' | 'TEACHER' | 'ADMIN';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_ACCESS_SECRET ?? 'dev_access_secret',
      ignoreExpiration: false,
    });
  }

  async validate(payload: any) {
    // payload = { sub, email, fullName, role, iat, exp }
    return {
      id: payload.sub,
      email: payload.email,
      fullName: payload.fullName,
      role: payload.role as Role,
    };
  }
}
