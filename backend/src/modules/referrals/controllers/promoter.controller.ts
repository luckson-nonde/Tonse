import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PromotersService } from '../services/promoters.service';
import { PromoterSignupDto } from '../dto/promoter-signup.dto';
import { UpdatePromoterProfileDto } from '../dto/update-promoter-profile.dto';

/**
 * Promoter-facing surface.
 *
 * /promoter/signup is public by design — the gate is the invite key in the
 * body (validated against PROMOTER_INVITE_KEY in the service), not an auth
 * guard. The page that posts here (/promote) is never linked from public
 * navigation; the URL + key travel privately to NDA'd artists.
 */
@Controller('promoter')
export class PromoterController {
  constructor(private readonly promotersService: PromotersService) {}

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signup(@Body() dto: PromoterSignupDto) {
    return this.promotersService.signup(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PROMOTER')
  async getMe(@Req() req: any) {
    return this.promotersService.getMe(req.user.id);
  }

  /** Edit profile — identity re-uploads reset verification to PENDING. */
  @Patch('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PROMOTER')
  async updateMe(@Req() req: any, @Body() dto: UpdatePromoterProfileDto) {
    return this.promotersService.updateProfile(req.user.id, dto);
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PROMOTER')
  async getDashboard(@Req() req: any) {
    return this.promotersService.getDashboard(req.user.id);
  }
}
