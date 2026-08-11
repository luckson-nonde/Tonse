import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, PackageOpen } from 'lucide-react';
import {
  storefrontService,
  StorefrontProductsPage,
  StorefrontSort,
} from '../../services/api/storefrontService';
import StorefrontProductCard from './StorefrontProductCard';
import InlineAdSlot, { interleaveAdCells } from '../ads/InlineAdSlot';

interface CategoryProductGridProps {
  categoryId: string;
  categoryName: string;
  onOpen: (href: string) => void;
  /** "Show all" / empty-state escape hatch — clears the category filter. */
  onClearCategory: () => void;
}

const SORT_TABS: Array<{ value: StorefrontSort; label: string }> = [
  { value: 'best', label: 'Best Selling' },
  { value: 'new', label: 'New' },
  { value: 'trending', label: 'Trending' },
];

const EMPTY_PAGE: StorefrontProductsPage = { items: [], total: 0, page: 1, pageSize: 12 };

/**
 * Category-driven product grid — replaces the curated storefront band while a
 * Top Categories card is active. Sort tabs and pagination are internal state:
 * a category switch resets both without any round-trip through the page or
 * the URL.
 */
export default function CategoryProductGrid({
  categoryId,
  categoryName,
  onOpen,
  onClearCategory,
}: CategoryProductGridProps) {
  const [sort, setSort] = useState<StorefrontSort>('best');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<StorefrontProductsPage>(EMPTY_PAGE);
  const [isLoading, setIsLoading] = useState(true);

  // Switching category starts the grid over — stale page numbers from the
  // previous category would land past the new category's last page.
  useEffect(() => {
    setSort('best');
    setPage(1);
  }, [categoryId]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    storefrontService
      .getProducts({ category: categoryId, sort, page })
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [categoryId, sort, page]);

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  const goToPage = (next: number) => {
    setPage(next);
    document.getElementById('category-product-grid')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="category-product-grid" className="px-5 sm:px-8 lg:px-12 mt-9 scroll-mt-24">
      <div className="flex items-baseline justify-between mb-3 gap-4">
        <div className="min-w-0">
          <h2 className="font-serif font-semibold text-[1.25rem] sm:text-[1.4rem] text-[#1B3068] truncate">
            {categoryName} listings
          </h2>
          <p className="text-[12.5px] text-[#8a8577] mt-0.5 truncate">
            {data.total > 0 ? `${data.total} listing${data.total === 1 ? '' : 's'} from verified shops` : ' '}
          </p>
        </div>
        <button
          onClick={onClearCategory}
          className="text-[12px] font-semibold text-[#a97c27] hover:underline underline-offset-2 shrink-0"
        >
          Show all
        </button>
      </div>

      {/* Sub-filter tabs — same pill language as the group chips below. */}
      <div className="flex gap-2.5 overflow-x-auto scrollbar-hide mb-4">
        {SORT_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setSort(tab.value);
              setPage(1);
            }}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-medium border transition-colors ${
              sort === tab.value
                ? 'bg-[#1B3068] text-white border-[#1B3068]'
                : 'bg-[#fffaf5] text-[#1e293b] border-[#e7e0d5] hover:border-[#c9973a]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="py-16 flex justify-center">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-[#c9973a]" />
        </div>
      ) : data.items.length === 0 ? (
        <div className="py-14 flex flex-col items-center text-center gap-3 bg-[#fffaf5] border border-[#e7e0d5] rounded-3xl">
          <PackageOpen className="w-8 h-8 text-[#c9973a]" />
          <p className="text-[14px] font-semibold text-[#1B3068]">
            No {categoryName} listings yet — check back soon.
          </p>
          <button
            onClick={onClearCategory}
            className="text-[12.5px] font-semibold text-[#a97c27] hover:underline underline-offset-2"
          >
            Browse other categories
          </button>
        </div>
      ) : (
        <>
          {/* Key on category+sort+page so every data change re-runs the cards'
              stagger entrance — the "smooth transition" between filter states. */}
          <div
            key={`${categoryId}-${sort}-${page}`}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4.5 items-stretch"
          >
            {/* Same weave as the storefront band — one sponsored cell per
                row, its column walking across rows — here targeted at the
                browsed category. */}
            {interleaveAdCells(data.items.length).map((cell) =>
              cell.kind === 'ad' ? (
                <InlineAdSlot
                  key={`ad-${cell.offset}`}
                  placement="CATEGORY_SIDEBAR"
                  categoryId={categoryId}
                  offset={cell.offset}
                />
              ) : (
                <StorefrontProductCard
                  key={data.items[cell.index].id}
                  card={data.items[cell.index]}
                  index={cell.index}
                  onOpen={onOpen}
                />
              ),
            )}
          </div>

          {totalPages > 1 && (
            <div className="mt-5 flex items-center justify-center gap-4">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                aria-label="Previous page"
                className="w-9 h-9 rounded-full border border-[#e7e0d5] bg-[#fffaf5] flex items-center justify-center text-[#1B3068] disabled:opacity-30 disabled:cursor-not-allowed hover:border-[#c9973a] transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[12.5px] font-semibold text-[#6b7280]">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                aria-label="Next page"
                className="w-9 h-9 rounded-full border border-[#e7e0d5] bg-[#fffaf5] flex items-center justify-center text-[#1B3068] disabled:opacity-30 disabled:cursor-not-allowed hover:border-[#c9973a] transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
