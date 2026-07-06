import { Controller, Get } from '@nestjs/common';
import { CategoriesService } from './categories.service';

/**
 * Public, unauthenticated read of the catalog's availability state. The
 * frontend already ships the full taxonomy (names, parents, schemas) as a
 * static import; it calls this only to learn which ids the admin has
 * switched off so it can hide them from every picker/browse surface.
 */
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get('status')
  async getStatus() {
    const items = await this.categoriesService.getStatus();
    return { items };
  }
}
