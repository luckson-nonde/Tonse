import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { CategoriesSeederService } from './categories.seeder';

@Module({
  imports: [TypeOrmModule.forFeature([Category])],
  providers: [CategoriesSeederService],
  exports: [TypeOrmModule, CategoriesSeederService],
})
export class CategoriesModule {}
