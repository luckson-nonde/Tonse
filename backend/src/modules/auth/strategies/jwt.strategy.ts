import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private usersService: UsersService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('jwt.secret'),
    });
  }

  async validate(payload: any) {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      // Throwing a plain Error here surfaces as a 500. UnauthorizedException
      // surfaces as a 401, which the frontend apiClient already handles by
      // clearing tokens + redirecting to /login — exactly what we want when
      // the JWT references a deleted user (e.g. stale localStorage tokens
      // left over from a wiped dev DB).
      throw new UnauthorizedException('User not found');
    }
    // Phase 3: email lives on the active profile, not the user row. The JWT
    // payload already carries the email claim from sign-in / refresh, so use
    // it directly — avoids an extra DB hit per authenticated request.
    return { id: user.id, email: payload.email, role: user.role, displayId: user.displayId };
  }
}
