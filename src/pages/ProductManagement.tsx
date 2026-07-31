import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { db } from '../services/api/database';
import { apiClient } from '../services/api/client';
import { Product } from '../types';
import { Plus, Trash2, Edit2, Package, Image as ImageIcon, Loader2, X, Play } from 'lucide-react';
import { uniqueKey } from '../utils/keyUtils';
import { getEffectiveBusinessTypes } from '../services/categories';
import { useActiveProfileContext } from '../hooks/useActiveProfileContext';
import { compressImage } from '../utils/compressImage';
import { extractYouTubeId } from '../services/api/portfolioService';
import PerformanceCatalog from './PerformanceCatalog';

/** Max photos per listing — keeps data-URL payloads well under limits. */
const MAX_LISTING_IMAGES = 5;

const EMPTY_FORM = {
  name: '',
  price: '',
  stock: '',
  description: '',
  category: '',
  images: [] as string[],
  youtubeUrl: '',
};

export default function ProductManagement() {
  const { user } = useAuth();
  // Persona-aware: rental copy fires only when the active mode is in
  // the events bucket. A multi-archetype seller in RETAIL persona
  // sees product copy even if they ALSO serve EVENTS.
  const { context: activeContext } = useActiveProfileContext();
  const effectiveTypes = getEffectiveBusinessTypes(user as any, activeContext);
  const isEventsBusiness = effectiveTypes.includes('EVENTS');

  // Entertainment providers (DJs, bands, MCs, dancers, etc.) don't sell
  // stock — their "catalog" is a portfolio of past gigs as social proof.
  // Backend-stored so buyers viewing a quote can render the embeds. The
  // products IndexedDB table stays untouched for retail/rental sellers
  // who legitimately list inventory.
  // SERVICE/REPAIR personas list services, not stocked goods — same
  // entity/endpoints, but the form drops the stock field and swaps copy.
  const isServiceBusiness =
    effectiveTypes.includes('SERVICE') || effectiveTypes.includes('REPAIR');
  if (effectiveTypes.includes('ENTERTAINMENT')) {
    return <PerformanceCatalog />;
  }
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Bumped after every successful mutation so the list refetches.
  const [refreshKey, setRefreshKey] = useState(0);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });

  const products =
    useLiveQuery(async () => {
      if (!user?.id) return [];
      const effectiveProviderId = user.parentProviderId || user.id;
      // GET /products/seller/:sellerId returns ALL of this seller's rows
      // newest-first (the generic /products list ignores unknown filters
      // and caps at 10 — wrong tool for a management view).
      const res = await apiClient.get<Product[]>(`/products/seller/${effectiveProviderId}`);
      return Array.isArray(res.data) ? res.data : [];
    }, [user, refreshKey]) || [];

  /** Compress each picked file and append it as a data URL (cap enforced). */
  const handlePickImages = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_LISTING_IMAGES - formData.images.length;
    const picked = Array.from(files).slice(0, Math.max(0, room));
    const dataUrls = await Promise.all(
      picked.map(async (file) => {
        const compressed = await compressImage(file);
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Could not read image'));
          reader.readAsDataURL(compressed);
        });
      }),
    );
    setFormData((f) => ({
      ...f,
      images: [...f.images, ...dataUrls].slice(0, MAX_LISTING_IMAGES),
    }));
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    // Same validation copy as PerformanceCatalog — accept watch/share/
    // embed/shorts links, reject anything unparseable.
    const trimmedYoutube = formData.youtubeUrl.trim();
    if (trimmedYoutube && !extractYouTubeId(trimmedYoutube)) {
      setSaveError(
        "That doesn't look like a YouTube URL. Paste a watch, share, embed, or shorts link.",
      );
      return;
    }

    setIsSubmitting(true);
    setSaveError(null);

    try {
      // Only fields CreateProductDto/UpdateProductDto declare — anything
      // extra is rejected by the backend's forbidNonWhitelisted pipe.
      const payload: Partial<Product> = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        images: formData.images,
      };
      // Empty price = "Price on request": omitted on create, explicit null
      // on edit so a previously set price can be cleared.
      if (formData.price !== '') payload.price = Number(formData.price);
      else if (isEditing) payload.price = null;
      if (trimmedYoutube) payload.youtubeUrl = trimmedYoutube;
      else if (isEditing) payload.youtubeUrl = null;
      if (!isServiceBusiness) payload.stock = Number(formData.stock) || 0;

      if (isEditing && editingProductId) {
        await db.products.update(editingProductId, payload);
        setIsEditing(false);
        setEditingProductId(null);
      } else {
        await db.products.add(payload as Product);
        setIsAdding(false);
      }
      setRefreshKey((k) => k + 1);
      setFormData({ ...EMPTY_FORM });
    } catch (error) {
      console.error('Failed to save product:', error);
      setSaveError(
        error instanceof Error && error.message
          ? error.message
          : 'Could not save. Please check the details and try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (product: Product) => {
    setFormData({
      name: product.name,
      price: product.price == null ? '' : String(product.price),
      stock: product.stock?.toString() || '',
      description: product.description,
      category: product.category,
      images: Array.isArray(product.images) ? product.images : [],
      youtubeUrl: product.youtubeUrl ?? '',
    });
    setEditingProductId(product.id!);
    setIsEditing(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeletingProductId(id);
  };

  const confirmDelete = async () => {
    if (deletingProductId) {
      await db.products.delete(deletingProductId);
      setDeletingProductId(null);
      setRefreshKey((k) => k + 1);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex-1"></div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-[#d49b35] hover:brightness-95 text-slate-900 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-[#d49b35]/20"
        >
          <Plus className="w-5 h-5" />
          {isServiceBusiness ? 'Add Service' : isEventsBusiness ? 'Add Item' : 'Add Product'}
        </button>
      </div>

      {(isAdding || isEditing) && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-4xl w-full max-w-md max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
              <h3 className="text-xl font-black text-slate-900">
                {isEditing
                  ? isServiceBusiness
                    ? 'Edit Service'
                    : isEventsBusiness
                      ? 'Edit Equipment'
                      : 'Edit Product'
                  : isServiceBusiness
                    ? 'Add New Service'
                    : isEventsBusiness
                      ? 'Add New Equipment'
                      : 'Add New Product'}
              </h3>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setIsEditing(false);
                  setEditingProductId(null);
                  setSaveError(null);
                  setFormData({ ...EMPTY_FORM });
                }}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              <form onSubmit={handleAddProduct} className="p-8 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    {isServiceBusiness
                      ? 'Service Name'
                      : isEventsBusiness
                        ? 'Equipment Name'
                        : 'Product Name'}
                  </label>
                  <input
                    type="text"
                    required
                    minLength={3}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#d49b35]/20 focus:border-[#d49b35] outline-none"
                    placeholder={
                      isServiceBusiness
                        ? 'e.g. Gel Manicure'
                        : isEventsBusiness
                          ? 'e.g. Professional Sound System'
                          : 'e.g. Minimalist Smart Watch'
                    }
                  />
                </div>
                <div
                  className={
                    isServiceBusiness ? '' : 'grid grid-cols-1 sm:grid-cols-2 gap-4'
                  }
                >
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Price (ZMW)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#d49b35]/20 focus:border-[#d49b35] outline-none"
                      placeholder="0.00"
                    />
                    <p className="mt-1 text-[10px] text-slate-400">
                      Leave empty for &ldquo;Price on request&rdquo;
                    </p>
                  </div>
                  {/* A service has no inventory count — the field only
                      renders for goods-selling personas. */}
                  {!isServiceBusiness && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                        {isEventsBusiness ? 'Stock Quantity' : 'Quantity'}
                      </label>
                      <input
                        type="number"
                        required
                        value={formData.stock}
                        onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#d49b35]/20 focus:border-[#d49b35] outline-none"
                        placeholder="e.g. 50"
                      />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Category
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#d49b35]/20 focus:border-[#d49b35] outline-none"
                    placeholder={
                      isServiceBusiness
                        ? 'e.g. Nail Care'
                        : isEventsBusiness
                          ? 'e.g. Plastic'
                          : 'e.g. Electronics'
                    }
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    {isServiceBusiness
                      ? 'Service Description'
                      : isEventsBusiness
                        ? 'Equipment Description'
                        : 'Description'}
                  </label>
                  <textarea
                    required
                    minLength={10}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#d49b35]/20 focus:border-[#d49b35] outline-none resize-none"
                    placeholder={
                      isServiceBusiness
                        ? 'Describe the service...'
                        : isEventsBusiness
                          ? 'Describe the equipment...'
                          : 'Describe your product...'
                    }
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    {isServiceBusiness
                      ? 'Service Photos'
                      : isEventsBusiness
                        ? 'Equipment Photos'
                        : 'Product Photos'}{' '}
                    ({formData.images.length}/{MAX_LISTING_IMAGES})
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {formData.images.map((src, idx) => (
                      <div
                        key={idx}
                        className="relative aspect-square rounded-2xl overflow-hidden bg-slate-100 group"
                      >
                        <img
                          src={src}
                          alt={`Photo ${idx + 1}`}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <button
                          type="button"
                          aria-label={`Remove photo ${idx + 1}`}
                          onClick={() =>
                            setFormData((f) => ({
                              ...f,
                              images: f.images.filter((_, i) => i !== idx),
                            }))
                          }
                          className="absolute top-1.5 right-1.5 p-1 bg-white/85 backdrop-blur-sm rounded-lg text-red-500 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {formData.images.length < MAX_LISTING_IMAGES && (
                      <button
                        type="button"
                        onClick={() => document.getElementById('product-image-input')?.click()}
                        className="aspect-square rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center transition-all hover:border-[#d49b35] cursor-pointer"
                      >
                        <ImageIcon className="w-6 h-6 text-slate-300 mb-1" />
                        <span className="text-[9px] font-bold text-slate-400 uppercase">
                          Add photos
                        </span>
                      </button>
                    )}
                  </div>
                  <input
                    id="product-image-input"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      void handlePickImages(e.target.files);
                      // Allow re-picking the same file after a remove.
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    YouTube Video (optional)
                  </label>
                  <input
                    type="url"
                    value={formData.youtubeUrl}
                    onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#d49b35]/20 focus:border-[#d49b35] outline-none"
                    placeholder="https://www.youtube.com/watch?v=…"
                  />
                  <p className="mt-1 text-[10px] text-slate-400">
                    A demo or promo clip buyers can watch on this listing
                  </p>
                </div>
                {saveError && (
                  <p className="text-sm text-red-600 bg-red-50 border border-[#fecaca] rounded-xl p-3">
                    {saveError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#d49b35] hover:brightness-95 text-slate-900 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#d49b35]/20"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isEditing ? (
                    <Edit2 className="w-5 h-5" />
                  ) : (
                    <Plus className="w-5 h-5" />
                  )}
                  {isEditing
                    ? isServiceBusiness
                      ? 'Update Service'
                      : isEventsBusiness
                        ? 'Update Equipment'
                        : 'Update Product'
                    : isServiceBusiness
                      ? 'List Service'
                      : isEventsBusiness
                        ? 'List Equipment'
                        : 'List Product'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {products.length === 0 ? (
          <div className="bg-white rounded-4xl p-12 text-center border border-slate-100">
            <Package className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">
              {isServiceBusiness
                ? 'No services listed yet.'
                : isEventsBusiness
                  ? 'No equipment listed yet.'
                  : 'No products listed yet.'}
            </p>
            <button
              onClick={() => setIsAdding(true)}
              className="text-[#d49b35] font-bold mt-2 hover:underline"
            >
              {isServiceBusiness
                ? 'Add your first service'
                : isEventsBusiness
                  ? 'Add your first item'
                  : 'Add your first product'}
            </button>
          </div>
        ) : (
          products.map((product, idx) => (
            <div
              key={uniqueKey('product', product.id, idx)}
              className="bg-white rounded-3xl p-4 flex items-center gap-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#f1f5f9] group hover:shadow-md transition-all"
            >
              {/* Thumbnail */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-slate-100 shrink-0 relative">
                {product.images?.[0] ? (
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-8 h-8 text-slate-300" />
                  </div>
                )}
                {product.youtubeUrl && (
                  <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-[#1a1612] flex items-center justify-center">
                    <Play className="w-2.5 h-2.5 text-white fill-white ml-px" />
                  </span>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0 py-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-[#fdf8f0] text-[#C9973A] px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border border-[#C9973A]/20">
                    {product.category}
                  </span>
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${product.isActive !== false ? 'bg-emerald-500' : 'bg-slate-300'}`}
                  ></div>
                </div>
                <h4 className="font-bold text-slate-900 text-sm sm:text-base truncate">
                  {product.name}
                </h4>
                <div className="flex items-center gap-3 mt-1">
                  {product.price != null && Number(product.price) > 0 ? (
                    <p className="text-[#C9973A] font-black text-sm sm:text-base">
                      ZMW {Number(product.price).toLocaleString()}
                    </p>
                  ) : (
                    <p className="text-slate-500 font-bold text-xs sm:text-sm">
                      Price on request
                    </p>
                  )}
                  {!isServiceBusiness && (
                    <>
                      <span className="text-slate-300 text-xs">•</span>
                      <p className="text-slate-500 text-xs font-medium">
                        Stock: {product.stock || 0}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center gap-2 shrink-0 pr-2">
                <button
                  onClick={() => handleEditClick(product)}
                  className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-50 hover:bg-slate-100 rounded-full flex items-center justify-center text-slate-600 hover:text-[#C9973A] transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteClick(product.id!)}
                  className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-50 hover:bg-slate-100 rounded-full flex items-center justify-center text-slate-600 hover:text-rose-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {deletingProductId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-4xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 p-8 text-center">
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 className="w-8 h-8 text-rose-600" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">Delete Item?</h3>
            <p className="text-slate-500 mb-8">
              Are you sure you want to remove this item from your{' '}
              {isServiceBusiness ? 'catalog' : 'inventory'}? This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setDeletingProductId(null)}
                className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-lg shadow-rose-600/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
