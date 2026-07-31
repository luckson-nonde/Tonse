import React from 'react';
import { Play } from 'lucide-react';
import { toNumber } from '../services/api/discoverService';

/** Minimal structural shape both DiscoverProduct and ShopProduct satisfy. */
export interface CatalogGridItem {
  id: string;
  name: string;
  description?: string;
  /** null/absent/0 renders as "Price on request". */
  price?: number | string | null;
  images?: string[];
  youtubeUrl?: string | null;
  stock?: number;
}

/** True when the listing has a real, positive listed price. */
export function hasListedPrice(item: { price?: number | string | null }): boolean {
  return toNumber(item.price) > 0;
}

interface CatalogItemGridProps {
  items: CatalogGridItem[];
  onItemClick?: (item: CatalogGridItem) => void;
  /** Show "Sold out" on stock-0 tiles — pass true only for goods-selling
   *  (SELLER) shops; service listings have no meaningful stock. */
  showSoldOut?: boolean;
}

/**
 * The shop-catalog tile grid shared by the public /discover/:id page and
 * the in-dashboard ShopProfileView. Opaque border hexes only (Mali-GPU
 * Android rule) — #e9d2aa is the gold hover tone precomputed over cream.
 */
export default function CatalogItemGrid({ items, onItemClick, showSoldOut }: CatalogItemGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
      {items.map((item) => {
        const soldOut = !!showSoldOut && item.stock === 0;
        return (
          <div
            key={item.id}
            className={`bg-[#fffaf5] border border-[#e7e0d5] rounded-2xl overflow-hidden hover:border-[#e9d2aa] transition-colors flex flex-col ${
              onItemClick ? 'cursor-pointer' : ''
            }`}
            onClick={onItemClick ? () => onItemClick(item) : undefined}
          >
            <div className="aspect-square bg-[#f1f5f9] overflow-hidden relative">
              {item.images?.[0] && (
                <img
                  src={item.images[0]}
                  alt={item.name}
                  className={`w-full h-full object-cover ${soldOut ? 'opacity-50 grayscale' : ''}`}
                  referrerPolicy="no-referrer"
                />
              )}
              {item.youtubeUrl && (
                <span className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-[#1a1612] flex items-center justify-center">
                  <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
                </span>
              )}
              {soldOut && (
                <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wider bg-[#1a1612] text-white px-2 py-1 rounded-full">
                  Sold out
                </span>
              )}
            </div>
            <div className="p-3">
              <h4 className="font-semibold text-[#1B3068] text-[13px] truncate">{item.name}</h4>
              {hasListedPrice(item) ? (
                <p className="text-[13px] font-bold text-[#a97c27] mt-0.5">
                  ZMW {toNumber(item.price).toLocaleString()}
                </p>
              ) : (
                <p className="text-[12px] font-semibold text-[#6b7280] mt-0.5">
                  Price on request
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
