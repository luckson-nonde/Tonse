import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { CategoriesSeederService } from './categories.seeder';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Category])],
  providers: [CategoriesSeederService, CategoriesService],
  controllers: [CategoriesController],
  exports: [TypeOrmModule, CategoriesSeederService, CategoriesService],
})
export class CategoriesModule {}
