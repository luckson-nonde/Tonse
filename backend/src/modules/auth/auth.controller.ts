import { Controller, Post, Body, UseGuards, Request, Get, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UsersService } from '../users/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  // Public availability check so the frontend can validate the email against
  // the database on the credentials step — before the user fills the rest of
  // the form and only hits a duplicate at the final submit.
  @Get('check-email')
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
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @UseGuards(JwtAuthGuard)
  async refresh(@Request() req) {
    return this.authService.refreshToken(req.user.id);
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
