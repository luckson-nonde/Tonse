import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
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

  /**
   * The Spotlight pop-up for THIS viewer, or `{ ad: null }` when they've had
   * their fill (frequency cap) or nothing is running. Public — a browsing
   * guest is exactly the audience, so `viewer` is a browser-minted anonymous
   * id when there's no account. Declared before `:id` so it isn't swallowed.
   */
  @Get('popup')
  async popup(@Query('viewer') viewer: string, @Query('category') category?: string) {
    if (!viewer) throw new BadRequestException('viewer is required');
    const ad = await this.ads.pickPopupForViewer(viewer, category);
    return { ad };
  }

  /** Attribution for a pop-up click. Fire-and-forget; never blocks the click. */
  @Post('popup/:id/click')
  @HttpCode(HttpStatus.NO_CONTENT)
  async popupClick(@Param('id') id: string, @Body() body: { viewer?: string }) {
    await this.ads.recordPopupClick(id, body?.viewer ?? '');
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

  /**
   * Public, minimal view of one ad — lets the shop page a buyer just landed on
   * name the ad they clicked ("Responding to: …") and stamp that attribution
   * onto the inquiry. Declared AFTER the static GET routes so 'active',
   * 'pricing-rates' and 'my-ads' aren't swallowed by :id.
   */
  @Get(':id')
  async publicOne(@Param('id') id: string) {
    return this.ads.getPublicAd(id);
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
