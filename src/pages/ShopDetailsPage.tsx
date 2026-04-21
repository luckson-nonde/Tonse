import React, { useMemo } from 'react';
import {
  ArrowLeft,
  Star,
  MapPin,
  FileText,
  Camera,
  Calendar,
  CheckCircle,
  ExternalLink,
  TrendingUp,
  ShoppingBag,
  BarChart2,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { db } from '../services/api/database';

export default function ShopDetailsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const shopId = Number(searchParams.get('id'));

  const shop = useLiveQuery(async () => {
    if (!shopId) return null;
    return await db.shops.get(shopId);
  }, [shopId]);

  /**
   * TEMPORARY CLIENT-SIDE ANALYSIS LOGIC
   * ------------------------------------
   * NOTE: In a production full-stack environment, this logic MUST be moved to the BACKEND.
   *
   * REASONING:
   * 1. Performance: Analyzing thousands of inquiries on the client-side is slow and battery-draining.
   * 2. Data Privacy: The client should not have access to all global inquiries just to see trending items.
   * 3. Scalability: A backend service (e.g., a Cron job or a background worker) should aggregate this
   *    data periodically and store the results in a "TrendingItems" table for fast retrieval.
   *
   * IMPLEMENTATION:
   * This logic scans all inquiries in the local database, filters them by the shop's category,
   * and counts the frequency of each item title to identify the "Most Requested" products.
   */
  const trendingItems =
    useLiveQuery(async () => {
      if (!shop) return [];

      // 1. Fetch all inquiries from the database
      const allInquiries = await db.inquiries.toArray();

      // 2. Filter inquiries by the shop's category to find relevant demand
      const relevantInquiries = allInquiries.filter((i) => i.category === shop.category);

      // 3. Aggregate item titles and count their frequency
      const itemCounts: { [key: string]: { count: number; description: string } } = {};

      relevantInquiries.forEach((inquiry) => {
        inquiry.items.forEach((item) => {
          const title = item.title.trim().toLowerCase();
          if (!itemCounts[title]) {
            itemCounts[title] = { count: 0, description: item.description };
          }
          itemCounts[title].count += 1;
        });
      });

      // 4. Convert to array, sort by frequency, and take the top 3
      return Object.entries(itemCounts)
        .map(([title, data]) => ({
          title: title.charAt(0).toUpperCase() + title.slice(1),
          count: data.count,
          description: data.description,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);
    }, [shop]) || [];

  if (!shop) {
    return (
      <div className="h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#d49b35]"></div>
      </div>
    );
  }

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8 pb-12">
      {/* Header */}
      <div className="relative h-55 overflow-hidden">
        <img
          src={shop.coverImage}
          alt={shop.name}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent"></div>
        <button
          onClick={() => navigate(-1)}
          className="absolute top-6 left-6 w-9 h-9 rounded-full bg-white/85 backdrop-blur-md text-brand-dark flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.15)] hover:bg-white transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Shop Info Card */}
      <div className="max-w-4xl mx-auto px-4 -mt-20 relative z-10">
        <div className="bg-white rounded-4xl p-6 sm:p-8 shadow-xl border border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-end gap-6 mb-8">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-white p-2 shadow-[0_8px_24px_rgba(0,0,0,0.15)] -mt-16 sm:-mt-24">
              <div className="w-full h-full rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black text-2xl overflow-hidden">
                {shop.logo ? (
                  <img src={shop.logo} alt={shop.name} className="w-full h-full object-cover" />
                ) : (
                  shop.name.substring(0, 2).toUpperCase()
                )}
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1
                  className="text-2xl font-serif font-bold text-brand-dark"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  {shop.name}
                </h1>
                {shop.isVerified && <CheckCircle className="w-5 h-5 text-[#C9973A]" />}
              </div>
              <p className="text-slate-500 font-medium mb-3">{shop.category}</p>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2 bg-[#fdfaf6] border border-[#e8e0d0] text-slate-700 px-3 py-1.5 rounded-full font-sans font-medium text-[13px]">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${star <= Math.round(shop.rating) ? 'text-[#C9973A] fill-[#C9973A]' : 'text-slate-300 fill-slate-300'}`}
                      />
                    ))}
                  </div>
                  <span className="font-bold text-brand-dark ml-1">{shop.rating}</span>
                  <span className="text-slate-400">({shop.reviewCount} reviews)</span>
                </div>
                <div className="flex items-center gap-1.5 bg-[#fdfaf6] border border-[#e8e0d0] text-slate-700 px-3 py-1 rounded-full font-sans font-medium text-[13px]">
                  <MapPin className="w-4 h-4 text-[#9ca3af]" />
                  {shop.location}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-8">
              {/* About */}
              <section>
                <h3 className="text-lg font-serif font-bold text-brand-dark mb-3 border-l-[3px] border-[#C9973A] pl-2.5">
                  About the Shop
                </h3>
                <p className="text-slate-600 leading-relaxed">{shop.description}</p>
              </section>

              {/* Proof Photos */}
              <section>
                <div className="flex items-center gap-2 mb-4 border-l-[3px] border-[#C9973A] pl-2.5">
                  <Camera className="w-5 h-5 text-[#64748b]" />
                  <h3 className="text-lg font-serif font-bold text-brand-dark">Proof Photos</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {shop.proofPhotos.map((photo, i) => (
                    <div
                      key={photo}
                      className="aspect-square rounded-2xl overflow-hidden border border-slate-100 shadow-sm"
                    >
                      <img
                        src={photo}
                        alt={`Proof ${i + 1}`}
                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ))}
                </div>
              </section>

              {/* Trending Market Demand (Most Requested Items) */}
              <section className="bg-white rounded-4xl p-6 border border-[#f1f5f9] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#C9973A] flex items-center justify-center text-white">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Trending Market Demand</h3>
                      <p className="text-[10px] font-sans font-bold text-[#9ca3af] uppercase tracking-wider">
                        Most requested in {shop.category}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {trendingItems.length > 0 ? (
                    trendingItems.map((item) => (
                      <div
                        key={item.title}
                        className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-all group"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-brand-blue/10 group-hover:text-brand-blue transition-colors">
                            <ShoppingBag className="w-4 h-4" />
                          </div>
                          <span className="text-[10px] font-black text-brand-blue bg-brand-blue/5 px-2 py-1 rounded-full">
                            {item.count} REQUESTS
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 mb-1">{item.title}</h4>
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-8 flex flex-col items-center justify-center text-center">
                      <BarChart2 className="w-6 h-6 text-[#d1c5b0] mb-2" />
                      <p className="text-[13px] text-[#9ca3af] font-sans font-normal">
                        Market data loading...
                      </p>
                    </div>
                  )}
                </div>
              </section>

              {/* GPS Location */}
              {shop.latitude && shop.longitude && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="w-5 h-5 text-slate-400" />
                    <h3 className="text-lg font-bold text-slate-900">Shop Location</h3>
                  </div>
                  <div className="aspect-video rounded-4xl overflow-hidden border border-slate-100 shadow-sm">
                    <iframe
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      scrolling="no"
                      marginHeight={0}
                      marginWidth={0}
                      src={`https://maps.google.com/maps?q=${shop.latitude},${shop.longitude}&hl=es&z=14&amp;output=embed`}
                    ></iframe>
                  </div>
                </section>
              )}
            </div>

            <div className="space-y-8">
              {/* Registration Info */}
              <section className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                <h3 className="text-[11px] font-sans font-bold text-[#C9973A] uppercase tracking-wider mb-4">
                  Registration Details
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#C9973A] shadow-sm">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-sans font-bold text-[#C9973A] uppercase tracking-wider">
                        Joined Platform
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {new Date(shop.registrationDate).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Documents */}
              <section>
                <div className="flex items-center gap-2 mb-4 border-l-[3px] border-[#C9973A] pl-2.5">
                  <FileText className="w-5 h-5 text-slate-400" />
                  <h3 className="text-lg font-serif font-bold text-brand-dark">Documents</h3>
                </div>
                <div className="space-y-3">
                  {shop.registrationDocuments.map((doc) => (
                    <a
                      key={doc}
                      href={doc}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 hover:border-[#d49b35]/20 hover:bg-[#fdf6e9] transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-[#C9973A] group-hover:bg-white transition-colors">
                          <FileText className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-bold text-slate-700">
                          Registration Document
                        </span>
                      </div>
                      <ExternalLink className="w-4 h-4 text-[#C9973A] group-hover:text-[#C9973A]" />
                    </a>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
