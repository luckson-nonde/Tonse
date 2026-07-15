import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/**
 * Verifies the Authorization: Bearer token against jwt.refreshSecret (the
 * regular JwtStrategy checks jwt.secret — the access-token secret — so it
 * was never actually validating a refresh token at all). Named 'jwt-refresh'
 * so JwtRefreshGuard (AuthGuard('jwt-refresh')) resolves to this strategy
 * specifically, not the default 'jwt' one.
 *
 * passReqToCallback + re-extracting the raw token in validate() is needed
 * because AuthService.refreshToken() must compare the presented token
 * against the DB-stored value (revocation / rotation check) — Passport's
 * validate() only receives the decoded payload by default, not the raw
 * token string.
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('jwt.refreshSecret'),
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: any) {
    if (payload?.type !== 'refresh') {
      throw new UnauthorizedException('Not a refresh token');
    }
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    return { id: payload.sub, refreshToken: token };
  }
}
