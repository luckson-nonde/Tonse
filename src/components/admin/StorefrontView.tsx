/**
 * Landing-page storefront — admin-authored promo tiles.
 *
 * These tiles fill the storefront grid on `/discover` while the platform has
 * nothing selling yet. Once real direct purchases land, best-selling listings
 * claim those slots automatically and tiles top up whatever is left — there is
 * no switch to flip here, which is why this screen has no "mode" control.
 *
 * Composition follows AdsAdminView: Promise.all load, per-row busy state,
 * inline editor, StatTile header. Primary admin only — the tab carries no
 * permission code and the backend routes are undecorated.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshCw,
  Loader2,
  LayoutGrid,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ImagePlus,
  Search,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  adminService,
  AdminPromoTile,
  AdminStorefrontProduct,
  PromoTileInput,
} from '../../services/api/adminService';
import { apiClient, uploadUrl } from '../../services/api/client';
import { CATEGORIES_DB } from '../../services/categories';
import { compressImage } from '../../utils/compressImage';
import { StatTile } from './DashboardPrimitives';

const CARD =
  'bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 shadow-[0_4px_18px_-12px_rgba(15,23,42,0.08)]';

/** Surface colours matching the landing page's cream palette. */
const SWATCHES = ['#f1ece1', '#f5efe6', '#eaf0f6', '#f6ecec', '#eef3ec', '#f2eef7'];

const MASTER_CATEGORIES = CATEGORIES_DB.filter((c) => !c.parentId);

const EMPTY_DRAFT: PromoTileInput = {
  title: '',
  subtitle: '',
  imageUrl: '',
  ctaLabel: '',
  targetProductId: null,
  targetShopProfileId: null,
  targetCategoryId: null,
  backgroundColor: SWATCHES[0],
  isActive: true,
};

export default function StorefrontView() {
  const [tiles, setTiles] = useState<AdminPromoTile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  /** Open editor: `null` = closed, `'new'` = create, otherwise a tile id. */
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<PromoTileInput>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Product picker
  const [productSearch, setProductSearch] = useState('');
  const [products, setProducts] = useState<AdminStorefrontProduct[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTiles(await adminService.listPromoTiles());
    } catch (e: any) {
      setError(e?.message || 'Failed to load storefront tiles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Debounced so typing in the picker doesn't fire a request per keystroke.
  useEffect(() => {
    if (!pickerOpen) return;
    const timer = setTimeout(() => {
      adminService
        .listStorefrontProducts({ search: productSearch.trim() || undefined, limit: 24 })
        .then(setProducts)
        .catch(() => setProducts([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [productSearch, pickerOpen]);

  const activeCount = useMemo(() => tiles.filter((t) => t.isActive).length, [tiles]);
  const selectedProduct = useMemo(
    () => products.find((p) => p.id === draft.targetProductId) ?? null,
    [products, draft.targetProductId],
  );

  const openCreate = () => {
    setDraft(EMPTY_DRAFT);
    setEditing('new');
    setFormError(null);
  };

  const openEdit = (tile: AdminPromoTile) => {
    setDraft({
      title: tile.title,
      subtitle: tile.subtitle ?? '',
      imageUrl: tile.imageUrl,
      ctaLabel: tile.ctaLabel ?? '',
      targetProductId: tile.targetProductId,
      targetShopProfileId: tile.targetShopProfileId,
      targetCategoryId: tile.targetCategoryId,
      backgroundColor: tile.backgroundColor ?? SWATCHES[0],
      isActive: tile.isActive,
    });
    setEditing(tile.id);
    setFormError(null);
  };

  const handleUpload = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    setFormError(null);
    try {
      const compressed = await compressImage(file);
      const formData = new FormData();
      formData.append('file', compressed, file.name);
      const res = await apiClient.post<{ url: string }>(
        '/files/upload?category=promo-tile',
        formData,
      );
      const url = res.data?.url;
      if (!url) throw new Error('Upload did not return a file URL');
      // Store the bare path the API returned; uploadUrl() resolves it against
      // the API origin at render time, on both this screen and the public page.
      setDraft((d) => ({ ...d, imageUrl: url }));
    } catch (e: any) {
      setFormError(e?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (saving) return;
    if (!draft.title.trim()) return setFormError('Give the tile a headline.');
    if (!draft.imageUrl) return setFormError('Upload an image for the tile.');
    setSaving(true);
    setFormError(null);
    try {
      // Empty strings mean "not set" — send null so the column clears rather
      // than storing a blank the public page would render as an empty line.
      const payload: PromoTileInput = {
        ...draft,
        title: draft.title.trim(),
        subtitle: draft.subtitle?.trim() || null,
        ctaLabel: draft.ctaLabel?.trim() || null,
        targetCategoryId: draft.targetCategoryId || null,
        targetProductId: draft.targetProductId || null,
        targetShopProfileId: draft.targetShopProfileId || null,
      };
      if (editing === 'new') {
        await adminService.createPromoTile(payload);
      } else if (editing) {
        await adminService.updatePromoTile(editing, payload);
      }
      setEditing(null);
      await load();
    } catch (e: any) {
      setFormError(e?.message || 'Failed to save this tile.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (tile: AdminPromoTile) => {
    setBusyId(tile.id);
    // Optimistic, reverted on failure — same pattern as LandingPageSettingsView.
    setTiles((rows) =>
      rows.map((r) => (r.id === tile.id ? { ...r, isActive: !r.isActive } : r)),
    );
    try {
      await adminService.updatePromoTile(tile.id, { isActive: !tile.isActive });
    } catch (e: any) {
      setTiles((rows) =>
        rows.map((r) => (r.id === tile.id ? { ...r, isActive: tile.isActive } : r)),
      );
      alert(e?.message || 'Failed to update this tile.');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (tile: AdminPromoTile) => {
    if (!confirm(`Delete "${tile.title}"? This cannot be undone.`)) return;
    setBusyId(tile.id);
    try {
      await adminService.deletePromoTile(tile.id);
      setTiles((rows) => rows.filter((r) => r.id !== tile.id));
    } catch (e: any) {
      alert(e?.message || 'Failed to delete this tile.');
    } finally {
      setBusyId(null);
    }
  };

  /**
   * Up/down rather than drag-and-drop: no DnD library exists in this repo, and
   * hand-rolled HTML5 drag doesn't work on touch. Positions are renumbered
   * from scratch and committed in one call, so gaps from earlier deletes heal
   * themselves.
   */
  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= tiles.length) return;
    const next = [...tiles];
    [next[index], next[target]] = [next[target], next[index]];
    setTiles(next);
    try {
      await adminService.reorderPromoTiles(next.map((t, i) => ({ id: t.id, sortOrder: i })));
    } catch (e: any) {
      alert(e?.message || 'Failed to save the new order.');
      await load();
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center gap-4 text-slate-400">
        {error ? (
          <>
            <p className="text-[13px] font-bold text-rose-500">{error}</p>
            <button
              onClick={load}
              className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[11px] font-bold uppercase tracking-widest text-slate-500 hover:text-[#1a1a2e] hover:border-[#C9973A] transition-all flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try again
            </button>
          </>
        ) : (
          <Loader2 className="w-8 h-8 animate-spin text-[#C9973A]" />
        )}
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-10">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#C9973A] mb-2">
            Platform / Landing page
          </p>
          <h1 className="font-serif text-[34px] sm:text-[40px] font-black text-[#1a1a2e] leading-none">
            Storefront
          </h1>
          <p className="mt-3 text-[14px] text-slate-500 max-w-xl leading-relaxed">
            Tiles you create fill the featured grid on the landing page. As listings start selling,
            the best sellers take those slots over automatically and your tiles fill what's left —
            so there's nothing to switch over by hand.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[11px] font-bold uppercase tracking-widest text-slate-500 hover:text-[#1a1a2e] hover:border-[#C9973A] transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            onClick={openCreate}
            className="px-4 py-2.5 bg-[#1a1a2e] text-white rounded-xl text-[11px] font-bold uppercase tracking-widest hover:bg-[#C9973A] transition-all flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            New tile
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6">
        <StatTile label="Tiles" value={tiles.length} hint="Created so far" icon={LayoutGrid} tone="navy" />
        <StatTile
          label="Live"
          value={activeCount}
          hint="Showing on the landing page"
          icon={Eye}
          tone="gold"
        />
      </div>

      {/* Editor */}
      {editing && (
        <div className={`${CARD} mb-6`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[12px] font-black uppercase tracking-widest text-[#1a1a2e]">
              {editing === 'new' ? 'New tile' : 'Edit tile'}
            </h3>
            <button
              onClick={() => setEditing(null)}
              className="text-slate-400 hover:text-[#1a1a2e] transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {/* Left: content */}
            <div className="space-y-4">
              <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Headline
                <input
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  maxLength={160}
                  placeholder="Solar fridges, installed free"
                  className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13px] font-normal normal-case tracking-normal text-slate-700 focus:border-[#C9973A] outline-none"
                />
              </label>

              <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Sub-line <span className="text-slate-300">(optional)</span>
                <input
                  value={draft.subtitle ?? ''}
                  onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })}
                  maxLength={200}
                  placeholder="From ZMW 4,200"
                  className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13px] font-normal normal-case tracking-normal text-slate-700 focus:border-[#C9973A] outline-none"
                />
              </label>

              <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Button text <span className="text-slate-300">(optional)</span>
                <input
                  value={draft.ctaLabel ?? ''}
                  onChange={(e) => setDraft({ ...draft, ctaLabel: e.target.value })}
                  maxLength={40}
                  placeholder="Shop now"
                  className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13px] font-normal normal-case tracking-normal text-slate-700 focus:border-[#C9973A] outline-none"
                />
              </label>

              <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Tile colour
                <div className="flex gap-2 mt-1.5">
                  {SWATCHES.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setDraft({ ...draft, backgroundColor: hex })}
                      style={{ backgroundColor: hex }}
                      className={`w-8 h-8 rounded-lg border-2 transition-all ${
                        draft.backgroundColor === hex ? 'border-[#C9973A]' : 'border-slate-200'
                      }`}
                      title={hex}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Right: image */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                Image
              </p>
              <label
                className="block aspect-[4/3] rounded-xl border-2 border-dashed border-slate-200 hover:border-[#C9973A] transition-colors cursor-pointer overflow-hidden relative"
                style={{ backgroundColor: draft.backgroundColor || '#f1ece1' }}
              >
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleUpload(e.target.files?.[0] ?? null)}
                />
                {draft.imageUrl ? (
                  <img
                    src={uploadUrl(draft.imageUrl)}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400">
                    {uploading ? (
                      <Loader2 className="w-6 h-6 animate-spin text-[#C9973A]" />
                    ) : (
                      <>
                        <ImagePlus className="w-6 h-6" />
                        <span className="text-[11px] font-bold">Click to upload</span>
                      </>
                    )}
                  </span>
                )}
              </label>
            </div>
          </div>

          {/* Target */}
          <div className="mt-5 pt-5 border-t border-slate-100">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">
              Where it goes when clicked
            </p>
            <p className="text-[12px] text-slate-500 mb-3">
              A listing wins over a category. Pick neither and the tile just opens the directory.
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] font-bold text-slate-500 mb-1.5">Category</p>
                <select
                  value={draft.targetCategoryId ?? ''}
                  onChange={(e) =>
                    setDraft({ ...draft, targetCategoryId: e.target.value || null })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13px] text-slate-700 focus:border-[#C9973A] outline-none"
                >
                  <option value="">No category</option>
                  {MASTER_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-500 mb-1.5">Listing</p>
                {draft.targetProductId && !pickerOpen ? (
                  <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13px] text-slate-700">
                    <span className="truncate flex-1">
                      {selectedProduct?.name ?? 'Listing selected'}
                    </span>
                    <button
                      onClick={() =>
                        setDraft({ ...draft, targetProductId: null, targetShopProfileId: null })
                      }
                      className="text-slate-400 hover:text-rose-500 transition-colors shrink-0"
                      title="Clear"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={productSearch}
                      onFocus={() => setPickerOpen(true)}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Search listings…"
                      className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 text-[13px] text-slate-700 focus:border-[#C9973A] outline-none"
                    />
                  </div>
                )}

                {pickerOpen && (
                  <div className="mt-2 max-h-52 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                    {products.length === 0 ? (
                      <p className="px-3 py-3 text-[12px] text-slate-400">No listings found.</p>
                    ) : (
                      products.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setDraft({
                              ...draft,
                              targetProductId: p.id,
                              targetShopProfileId: p.shopProfileId,
                            });
                            setPickerOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50 transition-colors"
                        >
                          {/* Product images are base64 data URLs — no prefixing. */}
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                          ) : (
                            <span className="w-8 h-8 rounded-lg bg-slate-100 shrink-0" />
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block text-[12.5px] font-semibold text-slate-700 truncate">
                              {p.name}
                            </span>
                            <span className="block text-[11px] text-slate-400 truncate">
                              {p.sellerName}
                              {p.salesCount > 0 ? ` · ${p.salesCount} sold` : ''}
                            </span>
                          </span>
                          {p.price != null && (
                            <span className="text-[11.5px] font-bold text-[#C9973A] shrink-0">
                              K{p.price.toLocaleString()}
                            </span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {formError && <p className="mt-4 text-[12px] font-bold text-rose-500">{formError}</p>}

          <div className="mt-5 flex gap-2">
            <button
              onClick={save}
              disabled={saving || uploading}
              className="px-5 py-2.5 bg-[#1a1a2e] text-white rounded-xl text-[11px] font-bold uppercase tracking-widest hover:bg-[#C9973A] transition-all disabled:opacity-40 flex items-center gap-2"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {editing === 'new' ? 'Create tile' : 'Save changes'}
            </button>
            <button
              onClick={() => setEditing(null)}
              className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-[11px] font-bold uppercase tracking-widest text-slate-500 hover:text-[#1a1a2e] transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tiles */}
      <div className={CARD}>
        <h3 className="text-[12px] font-black uppercase tracking-widest text-[#1a1a2e] mb-1">
          Tiles in order
        </h3>
        <p className="text-[12px] text-slate-500 mb-4 leading-relaxed">
          Top of this list fills the first free slot on the landing page.
        </p>

        {tiles.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-slate-400">
            No tiles yet — create one to fill the landing page's featured grid.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {tiles.map((tile, i) => (
              <div key={tile.id} className="py-3 flex items-center gap-3">
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    className="text-slate-300 hover:text-[#C9973A] disabled:opacity-25 transition-colors"
                    title="Move up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => move(i, 1)}
                    disabled={i === tiles.length - 1}
                    className="text-slate-300 hover:text-[#C9973A] disabled:opacity-25 transition-colors"
                    title="Move down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                <img
                  src={uploadUrl(tile.imageUrl)}
                  alt=""
                  className="w-14 h-11 rounded-lg object-cover shrink-0 bg-slate-100"
                  style={{ backgroundColor: tile.backgroundColor || undefined }}
                />

                <button onClick={() => openEdit(tile)} className="min-w-0 flex-1 text-left">
                  <span className="block text-[13px] font-semibold text-[#1a1a2e] truncate">
                    {tile.title}
                  </span>
                  <span className="block text-[11.5px] text-slate-400 truncate">
                    {tile.subtitle || '—'}
                    {tile.targetProductId
                      ? ' · links to a listing'
                      : tile.targetCategoryId
                        ? ` · links to ${tile.targetCategoryId}`
                        : ' · links to the directory'}
                  </span>
                </button>

                <button
                  onClick={() => toggleActive(tile)}
                  disabled={busyId === tile.id}
                  className={`shrink-0 transition-colors ${
                    tile.isActive ? 'text-emerald-500' : 'text-slate-300'
                  } hover:text-[#C9973A] disabled:opacity-40`}
                  title={tile.isActive ? 'Live — click to hide' : 'Hidden — click to show'}
                >
                  {tile.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => remove(tile)}
                  disabled={busyId === tile.id}
                  className="shrink-0 text-slate-300 hover:text-rose-500 transition-colors disabled:opacity-40"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
