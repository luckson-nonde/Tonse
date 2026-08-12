import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Star, ShieldCheck, Lock, Zap, ArrowRight } from 'lucide-react';
import Logo from '../components/Logo';
import DiscoverHeader from '../components/discover/DiscoverHeader';
import DiscoverHero from '../components/discover/DiscoverHero';
import TopCategoryRow from '../components/discover/TopCategoryRow';
import StorefrontCardGrid from '../components/discover/StorefrontCardGrid';
import CategoryProductGrid from '../components/discover/CategoryProductGrid';
import EmploymentSection from '../components/discover/EmploymentSection';
import EmploymentGrid from '../components/discover/EmploymentGrid';
import InlineAdSlot from '../components/ads/InlineAdSlot';
import { CATEGORY_GROUPS } from '../services/categories/groups';
import { CATEGORIES_DB } from '../services/categories';
import { fetchDiscoverShops, DiscoverShop } from '../services/api/discoverService';
import { storefrontService, StorefrontHome } from '../services/api/storefrontService';
import { jobBoardService, PublicJobFeedItem } from '../services/api/jobBoardService';
import { emitShoppingIntent } from '../services/spotlightTrigger';
import { masterCategoryOf } from '../services/categories/masterOf';

const NAVY = '#1B3068';
const NAVY_DEEP = '#142550';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

/**
 * Category lives in the body as an eyebrow line, never on the cover image —
 * an overlaid text badge of unknown length can't be made collision-safe
 * against the centered monogram fallback, so it doesn't go there at all.
 * Sizing is entirely the caller's responsibility (w-full h-full here): a
 * fixed-width row wrapper gives a uniform horizontal rail, a grid column
 * gives a uniform directory grid — the card itself never hardcodes a width.
 */
function ShopCard({ shop, onOpen }: { shop: DiscoverShop; onOpen: () => void }) {
  const isVerified = shop.verificationStatus === 'VERIFIED';
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen();
      }}
      className="w-full h-full bg-[#fffaf5] border border-[#e7e0d5] rounded-[18px] overflow-hidden cursor-pointer flex flex-col transition-all duration-150 hover:-translate-y-1 hover:shadow-[0_14px_32px_-6px_rgba(20,37,80,0.16)] hover:border-[#dcd3c4]"
    >
      <div
        className="relative aspect-[4/3] flex items-center justify-center overflow-hidden shrink-0"
        style={{ background: `linear-gradient(140deg, ${NAVY}, ${NAVY_DEEP})` }}
      >
        {shop.coverImage && (
          <img
            src={shop.coverImage}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(90% 90% at 80% 10%, rgba(201,151,58,0.30), transparent 60%)`,
          }}
        />
        {!shop.coverImage && (
          <span className="relative z-[1] font-serif font-semibold text-[2.4rem] text-[#c9973a] tracking-wide">
            {initials(shop.name)}
          </span>
        )}
        {isVerified && (
          <div
            className="absolute top-2.5 right-2.5 z-10 w-6 h-6 rounded-full bg-white/95 flex items-center justify-center shadow-sm"
            title="Verified provider"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#c9973a]" />
          </div>
        )}
      </div>
      <div className="px-4 pt-3 pb-3.5 flex flex-col flex-1 gap-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#a97c27] truncate">
          {shop.categoryNames[0] || 'Marketplace'}
        </span>
        <h3 className="font-serif text-[15px] font-semibold text-[#1B3068] leading-snug truncate">
          {shop.name}
        </h3>
        <div className="flex items-center gap-1.5 h-5 text-[13px] text-[#6b7280]">
          <span className="text-[#c9973a] font-semibold flex items-center gap-0.5 shrink-0">
            <Star className="w-3.5 h-3.5 fill-current" /> {toRating(shop.rating)}
          </span>
          <span className="w-[3px] h-[3px] rounded-full bg-[#d8cfbe] inline-block shrink-0" />
          <span className="truncate">{shop.location}</span>
        </div>
        <div className="mt-auto pt-2.5 flex items-center justify-between border-t border-[#f1ece1]">
          <span className="text-[12px] font-semibold text-[#a97c27]">Request quote</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#a97c27]" />
        </div>
      </div>
    </article>
  );
}

function toRating(rating: number): string {
  const n = Number(rating);
  return Number.isFinite(n) ? n.toFixed(1) : '0.0';
}

/**
 * Every category id that counts as "inside" a master category: its
 * subcategories, plus the master itself — a seller can subscribe DIRECTLY to a
 * master when it has nothing to drill into, so matching only on children would
 * silently hide those shops.
 */
function masterScopeIds(masterId: string): string[] {
  return [masterId, ...CATEGORIES_DB.filter((c) => c.parentId === masterId).map((c) => c.id)];
}

export default function DiscoverPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [shops, setShops] = useState<DiscoverShop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeGroup, setActiveGroup] = useState('All');
  const [storefront, setStorefront] = useState<StorefrontHome>({
    categories: [],
    cards: [],
    mode: 'PROMO',
  });
  // The whole public job board — loaded once, feeding three things: the
  // Employment rail, the Employment category grid, and the Top Categories
  // pill's live opening count. See publicCategoryLabels.ts for why 'labour'
  // reads "Employment" on this page specifically.
  const [employmentJobs, setEmploymentJobs] = useState<PublicJobFeedItem[]>([]);
  const [employmentLoading, setEmploymentLoading] = useState(true);

  // Category lives in the URL so a promo tile (or a shared link) can land
  // straight on a filtered directory: /discover?category=electronics.
  const activeCategory = searchParams.get('category');

  useEffect(() => {
    let isMounted = true;
    fetchDiscoverShops({ limit: 60 })
      .then((data) => {
        if (!isMounted) return;
        // 'labour' shops aren't a real concept in this product — a job is
        // posted by a buyer and worked by an individual, never "sold" by a
        // shop. What used to appear here was demo-seed data standing in for
        // real job postings, which now render from the actual job board via
        // EmploymentSection/EmploymentGrid below instead.
        const labourScope = masterScopeIds('labour');
        setShops(data.filter((s) => !s.categoryIds.some((id) => labourScope.includes(id))));
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Storefront loads independently of the shop directory — it fails soft to an
  // empty grid, so a storefront outage must not hold up or blank the rails.
  useEffect(() => {
    let isMounted = true;
    storefrontService.getHome().then((data) => {
      if (isMounted) setStorefront(data);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Same fail-soft contract as the storefront load above.
  useEffect(() => {
    let isMounted = true;
    jobBoardService
      .listPublicFeed()
      .then((data) => {
        if (isMounted) setEmploymentJobs(data);
      })
      .finally(() => {
        if (isMounted) setEmploymentLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  /** A category pick supersedes the group chip — they're two different ways to
   *  narrow the same list, and honouring both at once would silently return
   *  nothing whenever they disagree. */
  const handleCategorySelect = (categoryId: string) => {
    const next = activeCategory === categoryId ? null : categoryId;
    setSearchParams(next ? { category: next } : {});
    setActiveGroup('All');
    // Guests shop here without an account, so this is their equivalent of the
    // funnel's category step — the intent a Spotlight advert answers. Only on
    // SELECT, never on clearing the filter.
    if (next) emitShoppingIntent({ categoryId: masterCategoryOf(next) });
  };

  // Land the visitor on the results they just asked for, including on a cold
  // load from a promo-tile link.
  useEffect(() => {
    if (!activeCategory || isLoading) return;
    document.getElementById('discover-grid')?.scrollIntoView({ behavior: 'smooth' });
  }, [activeCategory, isLoading]);

  const availableGroups = useMemo(() => {
    const presentCategoryIds = new Set(shops.flatMap((s) => s.categoryIds || []));
    return CATEGORY_GROUPS.filter((g) => g.categoryIds.some((id) => presentCategoryIds.has(id)));
  }, [shops]);

  const filteredShops = useMemo(() => {
    const term = search.trim().toLowerCase();
    const group = availableGroups.find((g) => g.label === activeGroup);
    const categoryScope = activeCategory ? masterScopeIds(activeCategory) : null;
    return shops.filter((shop) => {
      if (categoryScope && !shop.categoryIds.some((id) => categoryScope.includes(id))) return false;
      if (group && !shop.categoryIds.some((id) => group.categoryIds.includes(id))) return false;
      if (!term) return true;
      return (
        shop.name.toLowerCase().includes(term) || shop.location.toLowerCase().includes(term)
      );
    });
  }, [shops, search, activeGroup, activeCategory, availableGroups]);

  const activeCategoryName = useMemo(() => {
    if (!activeCategory) return null;
    return (
      storefront.categories.find((c) => c.id === activeCategory)?.name ??
      CATEGORIES_DB.find((c) => c.id === activeCategory)?.name ??
      activeCategory
    );
  }, [activeCategory, storefront.categories]);

  // Default browse view: one rail per category group actually present in the
  // data — buyers navigate by WHAT they're looking for (Shopping,
  // Professional Services, Finance…), not by when a shop joined. Verified
  // shops lead within each rail.
  const groupedSections = useMemo(
    () =>
      availableGroups
        .map((group) => ({
          group,
          items: shops
            .filter((shop) => shop.categoryIds.some((id) => group.categoryIds.includes(id)))
            .sort((a, b) => {
              const av = a.verificationStatus === 'VERIFIED' ? 0 : 1;
              const bv = b.verificationStatus === 'VERIFIED' ? 0 : 1;
              return av - bv;
            })
            .slice(0, 10),
        }))
        .filter((section) => section.items.length > 0),
    [shops, availableGroups]
  );

  const categoryCount = useMemo(
    () => new Set(shops.flatMap((s) => s.categoryIds || [])).size,
    [shops]
  );

  return (
    <div className="min-h-screen bg-[#f5f2ed] text-[#1e293b]">
      <DiscoverHeader search={search} onSearchChange={setSearch} />

      {/* Hero — platform pitch + rotating featured-listing slides. */}
      <DiscoverHero
        shopCount={shops.length}
        categoryCount={categoryCount}
        cards={storefront.cards}
        categories={storefront.categories}
      />

      {/* Top categories — the storefront's way in, ahead of the shop rails. */}
      <TopCategoryRow
        categories={storefront.categories}
        activeCategoryId={activeCategory}
        onSelect={handleCategorySelect}
        captionOverrides={{
          labour: `${employmentJobs.length} opening${employmentJobs.length === 1 ? '' : 's'}`,
        }}
      />

      {/* One slot, three states: the Employment category (real job postings,
          a different data source entirely) shows the Employment grid; any
          other picked category shows that category's paginated product
          grid; otherwise the curated band (best-sellers topped up with
          admin promo tiles — the backend decides the mix). */}
      {activeCategory === 'labour' ? (
        <EmploymentGrid
          jobs={employmentJobs}
          isLoading={employmentLoading}
          onOpenJob={(id) => navigate(`/discover/jobs/${id}`)}
          onClearCategory={() => setSearchParams({})}
        />
      ) : activeCategory ? (
        <CategoryProductGrid
          categoryId={activeCategory}
          categoryName={activeCategoryName ?? 'Category'}
          onOpen={(href) => navigate(href)}
          onClearCategory={() => setSearchParams({})}
        />
      ) : (
        <StorefrontCardGrid
          cards={storefront.cards}
          mode={storefront.mode}
          onOpen={(href) => navigate(href)}
        />
      )}

      {/* Filter chips */}
      <div className="px-5 sm:px-8 lg:px-12 mt-9 flex gap-2.5 overflow-x-auto scrollbar-hide">
        {['All', ...availableGroups.map((g) => g.label)].map((label) => (
          <button
            key={label}
            onClick={() => {
              setActiveGroup(label);
              // Chips and the category tiles narrow the same list; picking one
              // clears the other rather than intersecting to nothing.
              if (activeCategory) setSearchParams({});
            }}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-medium border transition-colors ${
              activeGroup === label
                ? 'bg-[#1B3068] text-white border-[#1B3068]'
                : 'bg-[#fffaf5] text-[#1e293b] border-[#e7e0d5] hover:border-[#c9973a]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <main className="px-5 sm:px-8 lg:px-12 pb-16">
        {isLoading ? (
          <div className="py-24 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c9973a]" />
          </div>
        ) : shops.length === 0 ? (
          <div className="py-24 text-center text-[#6b7280]">
            No shops have registered yet — check back soon.
          </div>
        ) : (
          <>
            {activeCategory === 'labour' ? null /* EmploymentGrid, rendered above
              alongside TopCategoryRow, already covers this — filteredShops is
              always empty for 'labour' now that its shops are filtered out of
              the shop pipeline entirely, so this shop-grid branch would just
              show a redundant, always-empty "Labour & Skills providers"
              section underneath it. */ : activeGroup === 'All' && !search && !activeCategory ? (
              <div id="discover-sections" className="scroll-mt-24">
                {groupedSections.map(({ group, items }, gi) => {
                  // One sponsored cell per rail, its position walking across
                  // successive rails (front → middle → deeper) — same weave as
                  // the product grids, so the slots never line up down the page.
                  const adPos = Math.min([1, 3, 2, 4][gi % 4], items.length);
                  return (
                  <section key={group.id}>
                    <div className="flex items-baseline justify-between mt-9 mb-4">
                      <h2 className="font-serif font-semibold text-[1.25rem] sm:text-[1.4rem] text-[#1B3068]">
                        {group.label}
                      </h2>
                      <button
                        onClick={() => {
                          setActiveGroup(group.label);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="text-[12px] font-semibold text-[#a97c27] hover:underline underline-offset-2 shrink-0 flex items-center gap-1"
                      >
                        See all <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="relative">
                      <div className="flex items-stretch gap-3.5 sm:gap-4 overflow-x-auto pb-2 scrollbar-hide">
                        {items.slice(0, adPos).map((shop) => (
                          <div key={shop.id} className="w-56 sm:w-68 shrink-0">
                            <ShopCard shop={shop} onOpen={() => navigate(`/discover/${shop.id}`)} />
                          </div>
                        ))}
                        <div className="w-56 sm:w-68 shrink-0">
                          <InlineAdSlot placement="HOMEPAGE_CENTER" offset={gi} />
                        </div>
                        {items.slice(adPos).map((shop) => (
                          <div key={shop.id} className="w-56 sm:w-68 shrink-0">
                            <ShopCard shop={shop} onOpen={() => navigate(`/discover/${shop.id}`)} />
                          </div>
                        ))}
                      </div>
                      {/* Swipe cue: fades the rail's right edge so it reads as
                          scrollable on touch screens with no visible scrollbar. */}
                      {items.length > 2 && (
                        <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[#f5f2ed] to-transparent" />
                      )}
                    </div>
                  </section>
                  );
                })}
                {/* Its own explicit section, not folded into the loop above —
                    job postings are a structurally different data source
                    than the DiscoverShop[] every other rail here reads. */}
                <EmploymentSection
                  jobs={employmentJobs}
                  onOpenJob={(id) => navigate(`/discover/jobs/${id}`)}
                  onSeeAll={() => {
                    setSearchParams({ category: 'labour' });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              </div>
            ) : (
              <>
                <div id="discover-grid" className="flex items-baseline justify-between gap-4 mt-9 mb-4 scroll-mt-24">
                  <h2 className="font-serif font-semibold text-[1.25rem] sm:text-[1.4rem] text-[#1B3068] min-w-0 truncate">
                    {activeCategoryName
                      ? `${activeCategoryName} providers`
                      : activeGroup === 'All'
                        ? 'Search results'
                        : `${activeGroup} providers`}
                  </h2>
                  {activeCategory && (
                    <button
                      onClick={() => setSearchParams({})}
                      className="text-[12px] font-semibold text-[#a97c27] hover:underline underline-offset-2 shrink-0"
                    >
                      Show all
                    </button>
                  )}
                </div>
                {filteredShops.length === 0 ? (
                  <p className="text-[#6b7280]">No providers match that filter yet.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3.5 sm:gap-4.5 items-stretch">
                    {filteredShops.map((shop) => (
                      <ShopCard key={shop.id} shop={shop} onOpen={() => navigate(`/discover/${shop.id}`)} />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Trust strip */}
            <div className="mt-11 p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-3 gap-5 bg-[#fffaf5] border border-[#e7e0d5] rounded-2xl">
              <div className="flex gap-3 items-start">
                <div className="w-8.5 h-8.5 rounded-[9px] bg-[#1B3068]/8 text-[#1B3068] flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4.5 h-4.5" />
                </div>
                <div>
                  <strong className="block text-[#1B3068] text-[14px]">Verified providers</strong>
                  <span className="text-[13px] text-[#6b7280]">
                    ID + physical shop checked at registration.
                  </span>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-8.5 h-8.5 rounded-[9px] bg-[#1B3068]/8 text-[#1B3068] flex items-center justify-center shrink-0">
                  <Lock className="w-4.5 h-4.5" />
                </div>
                <div>
                  <strong className="block text-[#1B3068] text-[14px]">Escrow protected</strong>
                  <span className="text-[13px] text-[#6b7280]">
                    Funds released only after you inspect and confirm.
                  </span>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-8.5 h-8.5 rounded-[9px] bg-[#1B3068]/8 text-[#1B3068] flex items-center justify-center shrink-0">
                  <Zap className="w-4.5 h-4.5" />
                </div>
                <div>
                  <strong className="block text-[#1B3068] text-[14px]">Quotes in minutes</strong>
                  <span className="text-[13px] text-[#6b7280]">
                    One inquiry reaches the shop you choose.
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      <footer className="bg-[#142550] text-white/70 py-8 px-5 sm:px-8 lg:px-12">
        <div className="flex flex-col sm:flex-row gap-4 items-center sm:justify-between text-center sm:text-left text-sm">
          <Logo variant="light" className="text-xl" />
          <span>Intelligent · Connected · Trusted</span>
          <div className="flex items-center gap-1">
            Not registered yet?
            <button
              onClick={() => navigate('/register')}
              className="text-[#c9973a] font-semibold inline-flex items-center gap-1 hover:underline"
            >
              List your shop <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
