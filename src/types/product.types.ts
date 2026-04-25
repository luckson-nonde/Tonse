// Product types
export interface Product {
  id: string;
  sellerId: string;
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  images: string[];
  brand?: string;
  condition?: string;
  rating?: number;
  reviewCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductFilter {
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
  search?: string;
}
