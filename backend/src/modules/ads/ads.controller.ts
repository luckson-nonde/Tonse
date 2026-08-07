import { Body, Controller, Get, Param, Post, Query, Request, UseGuards, BadRequestException } from '@nestjs/common';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { AdsService } from './ads.service';
import { CreateAdvertisementDto } from './dto/create-advertisement.dto';
import { AD_PLACEMENTS, AdPlacementLocation } from './entities/advertisement.entity';
import { CheckoutService } from '../payments/checkout.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

class AdCheckoutDto {
  @IsOptional()
  @IsIn(['mobile-money', 'card'])
  channel?: 'mobile-money' | 'card';

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  operator?: string;
}

const PLACEMENTS = AD_PLACEMENTS;

@Controller('ads')
export class AdsController {
  constructor(
    private readonly ads: AdsService,
    private readonly checkout: CheckoutService,
  ) {}

  @Get('pricing-rates')
  async pricingRates() {
    return this.ads.getPricingRatesPublic();
  }

  /** Public — no auth. Powers the homepage / secondary-page / category-rail
   *  ad carousels and the "want to advertise here?" fallback (empty response).
   *  `category` targets the CATEGORY_SIDEBAR rail at what the buyer is
   *  browsing (e.g. electronics → electronics ads, loans → lender ads). */
  @Get('active')
  async active(@Query('placement') placement: string, @Query('category') category?: string) {
    if (!PLACEMENTS.includes(placement as AdPlacementLocation)) {
      throw new BadRequestException(`placement must be one of ${PLACEMENTS.join(', ')}`);
    }
    return this.ads.getActiveAdsForPlacement(placement as AdPlacementLocation, category);
  }

  @Post('create')
  @UseGuards(JwtAuthGuard)
  async create(@Body() dto: CreateAdvertisementDto, @Request() req) {
    return this.ads.createDraftAd(req.user.id, dto);
  }

  @Get('my-ads')
  @UseGuards(JwtAuthGuard)
  async myAds(@Request() req) {
    return this.ads.listMyAds(req.user.id);
  }

  /** Start a PSP collection (mobile money / card) for a PENDING_PAYMENT ad.
   *  Same shape as venture-account/deposit — poll/simulate reuse the generic
   *  /payments/checkout/:reference endpoints. */
  @Post(':id/checkout')
  @UseGuards(JwtAuthGuard)
  async checkoutAd(@Param('id') id: string, @Body() dto: AdCheckoutDto, @Request() req) {
    return this.checkout.initiateAdPurchase(req.user.id, id, dto);
  }

  /** Pay straight out of the seller's venture balance — instant, no PSP round-trip. */
  @Post(':id/pay-from-balance')
  @UseGuards(JwtAuthGuard)
  async payFromBalance(@Param('id') id: string, @Request() req) {
    return this.ads.payFromBalance(req.user.id, id);
  }
}
