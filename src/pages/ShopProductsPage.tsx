import React from 'react';
import { ArrowLeft, Star, MapPin, TrendingUp, ShoppingBag, ChevronRight } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { db } from '../services/api/database';

export default function ShopProductsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const shopId = Number(searchParams.get('id'));

  const shop = useLiveQuery(
    async () => {
      if (!shopId) return null;
      return await db.shops.get(shopId);
    },
    [shopId]
  );

  const shopProducts = useLiveQuery(
    async () => {
      if (!shop) return [];
      return await db.products.where('providerId').equals(shop.providerId).toArray();
    },
    [shop]
  );

  /**
   * STANDARD ARCHITECTURE FOR TRENDING LOGIC (HOW IT SHOULD BE IN PRODUCTION)
   * ------------------------------------------------------------------------
   * In a standard, production-grade Progressive Web App (PWA) with a full backend:
   * 
   * 1. Database Schema (The "Accounting"):
   *    - We don't calculate this on the fly. Instead, we have a `Products` or `Catalog` table.
   *    - Every time an order is PAID or COMPLETED, a database trigger or backend service 
   *      increments an `orderCount` or `requestFrequency` column on that specific product.
   * 
   * 2. Backend Aggregation (The "Algorithm"):
   *    - A background worker (Cron Job) runs periodically (e.g., every hour).
   *    - It runs a query like: `SELECT * FROM Products WHERE shopId = X ORDER BY orderCount DESC LIMIT 10`
   *    - It caches this result in a fast-read layer (like Redis) or a Materialized View.
   * 
   * 3. The Frontend (The "Post Display"):
   *    - The frontend simply makes a fast GET request to `/api/shops/:id/trending`.
   *    - It receives pre-formatted "Posts" that include the Shop's uploaded images, 
   *      the product details, and the exact number of successful orders.
   * 
   * CURRENT PROTOTYPE IMPLEMENTATION:
   * To simulate this standard, we are aggregating local inquiries and mapping them 
   * to the shop's uploaded proof photos to create a "Post-like" feed.
   */
  const trendingPosts = useLiveQuery(
    async () => {
      if (!shop) return [];
      
      // Step 1: Simulate backend counting of requests/orders
      const allInquiries = await db.inquiries.toArray();
      const relevantInquiries = allInquiries.filter(i => i.category === shop.category);
      
      const itemCounts: { [key: string]: { count: number, description: string } } = {};
      
      relevantInquiries.forEach(inquiry => {
        inquiry.items.forEach(item => {
          const title = item.title.trim().toLowerCase();
          if (!itemCounts[title]) {
            itemCounts[title] = { count: 0, description: item.description };
          }
          itemCounts[title].count += item.quantity || 1; // Account for amount of products ordered
        });
      });

      // Step 2: Simulate backend joining data with Shop's uploaded images to create "Posts"
      const sortedItems = Object.entries(itemCounts)
        .map(([title, data]) => ({
          title: title.charAt(0).toUpperCase() + title.slice(1),
          count: data.count,
          description: data.description
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 4); // Top 4 items

      // Map to shop photos to create the "Post" visual
      return sortedItems.map((item, index) => ({
        ...item,
        // Use shop's uploaded photos, cycle through them if there are more items than photos
        image: shop.proofPhotos[index % shop.proofPhotos.length] || 'https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=800&q=80'
      }));
    },
    [shop]
  ) || [];

  if (!shop) {
    return (
      <div className="h-[50vh] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-slate-200 rounded-full"></div>
          <div className="h-4 w-32 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 hover:text-[#d49b35] transition-colors font-bold"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <div className="flex items-center gap-2 bg-[#d49b35]/10 px-3 py-1.5 rounded-xl border border-[#d49b35]/20">
          <TrendingUp className="w-4 h-4 text-[#b3822c]" />
          <span className="text-xs font-bold text-[#b3822c] uppercase tracking-wider">Trending</span>
        </div>
      </div>

      {/* Shop Summary Card */}
      <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 mb-8 flex items-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black text-xl shadow-lg flex-shrink-0">
            {shop.logo ? (
              <img src={shop.logo} alt={shop.name} className="w-full h-full object-cover rounded-2xl" />
            ) : (
              shop.name.substring(0, 2).toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-slate-900 mb-1">{shop.name}</h2>
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-[#d49b35] fill-[#d49b35]" />
                <span className="font-bold text-slate-900">{shop.rating}</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>{shop.location}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Trending Products Section (On Demand) */}
        <div className="mb-12">
          <div className="flex items-center justify-between px-1 mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#ca8a04]" />
              <h3 className="text-lg font-bold text-slate-900">Most Wanted</h3>
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">On Demand</span>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
            {trendingPosts.length > 0 ? (
              trendingPosts.map((post) => (
                <div 
                  key={post.title} 
                  className="flex-shrink-0 w-64 bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-md transition-all group cursor-pointer"
                  onClick={() => navigate(`/buyer/create-inquiry?prefill=${encodeURIComponent(post.title)}`)}
                >
                  <div className="h-32 w-full relative">
                    <img 
                      src={post.image} 
                      alt={post.title} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-2 right-2 bg-[#d49b35] text-slate-900 px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
                      <TrendingUp className="w-3 h-3" />
                      <span className="text-[8px] font-black uppercase tracking-wider">
                        {post.count} Requests
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h4 className="font-bold text-slate-900 text-sm mb-1 line-clamp-1">{post.title}</h4>
                    <p className="text-xs text-slate-500 line-clamp-1">{post.description}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="w-full bg-slate-50 rounded-3xl p-8 text-center border border-dashed border-slate-200">
                <p className="text-slate-500 text-sm">No on-demand items yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Shop Products Section (The Wall) */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#d49b35]" />
              <h3 className="text-lg font-bold text-slate-900">Shop Products</h3>
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{shopProducts?.length || 0} Items</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {shopProducts && shopProducts.length > 0 ? (
              shopProducts.map((product) => (
                <div 
                  key={product.id} 
                  className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-slate-100 hover:shadow-md hover:border-[#d49b35]/30 transition-all group cursor-pointer flex flex-col"
                  onClick={() => navigate(`/buyer/create-inquiry?prefill=${encodeURIComponent(product.name)}`)}
                >
                  {/* Product Image */}
                  <div className="h-56 w-full relative overflow-hidden">
                    <img 
                      src={product.images?.[0] || 'https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=800&q=80'} 
                      alt={product.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm text-slate-900 px-3 py-1.5 rounded-full font-black text-xs shadow-sm">
                      UGX {product.price?.toLocaleString()}
                    </div>
                  </div>

                  {/* Product Content */}
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-bold text-slate-900 text-lg group-hover:text-[#d49b35] transition-colors line-clamp-1">
                        {product.name}
                      </h4>
                    </div>
                    
                    <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed mb-6 flex-1">
                      {product.description}
                    </p>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-50 mt-auto">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Star className="w-4 h-4 text-[#d49b35] fill-[#d49b35]" />
                        <span className="text-xs font-bold uppercase tracking-wider">Available</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#d49b35] font-bold text-sm">
                        <span>Inquire</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full bg-white rounded-[32px] p-12 text-center border border-dashed border-slate-200">
                <ShoppingBag className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">No products listed in this shop yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-12 bg-slate-900 rounded-[32px] p-8 text-center text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#d49b35]/20 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          <div className="relative z-10">
            <h3 className="text-2xl font-black mb-2">Need something else?</h3>
            <p className="text-slate-300 text-sm mb-8 max-w-xs mx-auto">Send a custom inquiry to {shop.name} and get a personalized quote within minutes.</p>
            <button 
              onClick={() => navigate('/buyer/create-inquiry')}
              className="px-8 py-4 bg-[#d49b35] hover:brightness-95 text-slate-900 font-bold rounded-2xl transition-all shadow-lg hover:scale-105 active:scale-95"
            >
              Create Custom Inquiry
            </button>
          </div>
        </div>
      </div>
  );
}
