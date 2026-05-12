import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortfolioItem } from './entities/portfolio-item.entity';
import { PortfolioService } from './portfolio.service';
import { PortfolioController } from './portfolio.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PortfolioItem])],
  providers: [PortfolioService],
  controllers: [PortfolioController],
  exports: [PortfolioService],
})
export class PortfolioModule {}
