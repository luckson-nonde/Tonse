import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
  ForbiddenException,
} from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { CreatePortfolioItemDto } from './dto/create-portfolio-item.dto';
import { UpdatePortfolioItemDto } from './dto/update-portfolio-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthenticatedRequest extends Request {
  user: { id: string };
}

@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly service: PortfolioService) {}

  /** Public: anyone holding a quote/profile link can read a provider's
   *  portfolio so embeds render without forcing the buyer to log in. */
  @Get('user/:userId')
  async findByUser(@Param('userId') userId: string) {
    return this.service.findByUser(userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreatePortfolioItemDto, @Request() req: AuthenticatedRequest) {
    return this.service.create(req.user.id, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePortfolioItemDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const item = await this.service.findOne(id);
    if (item.userId !== req.user.id) {
      throw new ForbiddenException('You can only edit your own portfolio items');
    }
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const item = await this.service.findOne(id);
    if (item.userId !== req.user.id) {
      throw new ForbiddenException('You can only delete your own portfolio items');
    }
    return this.service.remove(id);
  }
}
