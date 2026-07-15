import { Controller, Post, Body, UseGuards, Request, Get, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { UsersService } from '../users/users.service';

// Tighter than the app-wide default (200/min) — these are exactly the
// routes credential-stuffing, registration spam, and email-enumeration
// scripts target. 5 attempts/minute per IP is generous for a real user,
// punishing for a script.
const AUTH_THROTTLE = { default: { limit: 5, ttl: 60000 } };

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Post('register')
  @Throttle(AUTH_THROTTLE)
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  // Public availability check so the frontend can validate the email against
  // the database on the credentials step — before the user fills the rest of
  // the form and only hits a duplicate at the final submit.
  @Get('check-email')
  @Throttle(AUTH_THROTTLE)
  async checkEmail(@Query('email') email: string) {
    const value = (email || '').trim().toLowerCase();
    if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      // Malformed — the client's format validator owns that message; report
      // "available" so we never show a confusing "taken" for bad input.
      return { available: true };
    }
    const existing = await this.usersService.findByEmail(value).catch(() => null);
    return { available: !existing };
  }

  @Post('login')
  @Throttle(AUTH_THROTTLE)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('forgot-password')
  @Throttle(AUTH_THROTTLE)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Post('reset-password')
  @Throttle(AUTH_THROTTLE)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  async refresh(@Request() req) {
    return this.authService.refreshToken(req.user.id, req.user.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Request() req) {
    return this.authService.logout(req.user.id);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@Request() req) {
    const user = await this.usersService.findById(req.user.id);
    if (!user) return null;
    // Phase 3: merge the active profile into the response so frontend reads
    // like user.companyName, user.name, user.verificationStatus all work.
    const flat = await this.usersService.flattenWithProfile(user);
    if (flat) {
      delete flat.password;
      delete flat.refreshToken;
    }
    return flat;
  }
}
