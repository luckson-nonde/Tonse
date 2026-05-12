import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, X, Music, ExternalLink, Edit2, Trash2,
  CalendarDays, MapPin, Loader2, AlertTriangle, Play,
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import {
  fetchUserPortfolio,
  createPortfolioItem,
  updatePortfolioItem,
  deletePortfolioItem,
  extractYouTubeId,
  youTubeEmbedUrl,
  youTubeThumbnailUrl,
  type PortfolioItem,
} from '../services/api/portfolioService';

interface FormState {
  title: string;
  youtubeUrl: string;
  eventName: string;
  eventDate: string;
  description: string;
}

const EMPTY_FORM: FormState = {
  title: '',
  youtubeUrl: '',
  eventName: '',
  eventDate: '',
  description: '',
};

export default function PerformanceCatalog() {
  const { user } = useAuth();
  const userId = user?.id ? String(user.id) : '';

  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<PortfolioItem | null>(null);
  const [previewing, setPreviewing] = useState<PortfolioItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    fetchUserPortfolio(userId)
      .then((rows) => { if (!cancelled) setItems(rows); })
      .catch((err) => { if (!cancelled) setError(err?.message || 'Could not load portfolio'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId]);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEdit = (item: PortfolioItem) => {
    setEditing(item);
    setForm({
      title: item.title,
      youtubeUrl: item.youtubeUrl,
      eventName: item.eventName ?? '',
      eventDate: item.eventDate ?? '',
      description: item.description ?? '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const videoId = extractYouTubeId(form.youtubeUrl);
    if (!videoId) {
      setFormError("That doesn't look like a YouTube URL. Paste a watch, share, embed, or shorts link.");
      return;
    }
    if (!form.title.trim()) {
      setFormError('Add a title so buyers can scan your catalog at a glance.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        youtubeUrl: form.youtubeUrl.trim(),
        eventName: form.eventName.trim() || undefined,
        eventDate: form.eventDate || undefined,
        description: form.description.trim() || undefined,
      };
      if (editing) {
        const updated = await updatePortfolioItem(editing.id, payload);
        setItems((prev) => prev.map((p) => (p.id === editing.id ? updated : p)));
      } else {
        const created = await createPortfolioItem(payload);
        setItems((prev) => [created, ...prev]);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err?.message || 'Could not save. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item: PortfolioItem) => {
    if (!confirm(`Remove "${item.title}" from your catalog?`)) return;
    try {
      await deletePortfolioItem(item.id);
      setItems((prev) => prev.filter((p) => p.id !== item.id));
    } catch (err: any) {
      alert(err?.message || 'Could not delete.');
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto pb-20">
      <Header onAdd={openAdd} count={items.length} />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : items.length === 0 ? (
        <EmptyState onAdd={openAdd} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mt-2">
          {items.map((item) => (
            <PortfolioCard
              key={item.id}
              item={item}
              onPreview={() => setPreviewing(item)}
              onEdit={() => openEdit(item)}
              onDelete={() => handleDelete(item)}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <FormModal
            form={form}
            setForm={setForm}
            onClose={() => setIsModalOpen(false)}
            onSubmit={handleSubmit}
            submitting={submitting}
            editing={!!editing}
            error={formError}
          />
        )}
        {previewing && (
          <PreviewModal item={previewing} onClose={() => setPreviewing(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function Header({ onAdd, count }: { onAdd: () => void; count: number }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-brand-dark tracking-tight">
          Performance Catalog
        </h1>
        <p className="text-[13px] text-slate-500 mt-1">
          Showcase past gigs as proof of work — buyers reviewing your quotes will see these embeds.
          {count > 0 && <> · {count} {count === 1 ? 'piece' : 'pieces'}</>}
        </p>
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-2 px-4 py-3 bg-[#c9973a] text-white rounded-xl font-bold text-sm shadow-lg shadow-[#c9973a]/30 hover:brightness-110 active:scale-[0.99] transition-all"
      >
        <Plus className="w-4 h-4" strokeWidth={2.5} />
        Add performance
      </button>
    </div>
  );
}

function PortfolioCard({
  item,
  onPreview,
  onEdit,
  onDelete,
}: {
  item: PortfolioItem;
  onPreview: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const videoId = extractYouTubeId(item.youtubeUrl);
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <button
        type="button"
        onClick={onPreview}
        className="block w-full aspect-video bg-[#f5f2ed] relative overflow-hidden group cursor-pointer"
        aria-label={`Play ${item.title}`}
      >
        {videoId ? (
          <img
            src={youTubeThumbnailUrl(videoId)}
            alt={item.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            <Music className="w-10 h-10" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-white/95 text-[#c9973a] flex items-center justify-center shadow-md scale-90 group-hover:scale-100 transition-transform">
            <Play className="w-6 h-6 ml-0.5" fill="currentColor" />
          </div>
        </div>
      </button>

      <div className="p-4">
        <h3 className="font-bold text-brand-dark text-[15px] leading-tight line-clamp-2 tracking-tight">
          {item.title}
        </h3>

        {(item.eventName || item.eventDate) && (
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
            {item.eventName && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {item.eventName}
              </span>
            )}
            {item.eventDate && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="w-3 h-3" /> {formatEventDate(item.eventDate)}
              </span>
            )}
          </div>
        )}

        {item.description && (
          <p className="text-[12px] text-slate-500 mt-2 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        )}

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
          <a
            href={item.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-bold uppercase tracking-wider text-[#c9973a] hover:underline inline-flex items-center gap-1"
          >
            Open on YouTube <ExternalLink className="w-3 h-3" />
          </a>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onEdit}
              aria-label="Edit"
              className="p-2 rounded-lg text-slate-400 hover:bg-[#f5f2ed] hover:text-brand-dark transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              aria-label="Delete"
              className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormModal({
  form,
  setForm,
  onClose,
  onSubmit,
  submitting,
  editing,
  error,
}: {
  form: FormState;
  setForm: (next: FormState) => void;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  submitting: boolean;
  editing: boolean;
  error: string | null;
}) {
  const previewId = useMemo(() => extractYouTubeId(form.youtubeUrl), [form.youtubeUrl]);

  return (
    <div className="fixed inset-0 z-100 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 280 }}
        className="relative w-full max-w-xl bg-white rounded-t-[28px] sm:rounded-[28px] border border-slate-200 shadow-xl overflow-hidden"
      >
        <div className="px-6 sm:px-7 pt-6 pb-4 border-b border-slate-100 flex items-start justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#c9973a]">
              Performance catalog
            </p>
            <h2 className="mt-1 text-xl font-bold font-serif text-brand-dark tracking-tight">
              {editing ? 'Edit performance' : 'Add a performance'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 hover:bg-[#f5f2ed] rounded-full text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col max-h-[80vh]">
          <div className="px-6 sm:px-7 py-5 space-y-4 overflow-y-auto flex-1 min-h-0">
          <Field label="YouTube URL" required>
            <input
              type="url"
              value={form.youtubeUrl}
              onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })}
              placeholder="https://www.youtube.com/watch?v=…"
              required
              className="w-full p-3 bg-[#f5f2ed] border border-slate-200 rounded-xl outline-none focus:border-[#c9973a] transition-all text-brand-dark placeholder-slate-400 text-sm"
            />
          </Field>

          {previewId && (
            <div className="rounded-xl overflow-hidden border border-slate-200 aspect-video bg-black">
              <iframe
                src={youTubeEmbedUrl(previewId)}
                title="Preview"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          <Field label="Title" required>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Live set at Sunset Festival"
              required
              maxLength={255}
              className="w-full p-3 bg-[#f5f2ed] border border-slate-200 rounded-xl outline-none focus:border-[#c9973a] transition-all text-brand-dark placeholder-slate-400 text-sm font-medium"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Event / venue (optional)">
              <input
                type="text"
                value={form.eventName}
                onChange={(e) => setForm({ ...form, eventName: e.target.value })}
                placeholder="e.g. Sunset Festival, Lusaka"
                maxLength={255}
                className="w-full p-3 bg-[#f5f2ed] border border-slate-200 rounded-xl outline-none focus:border-[#c9973a] transition-all text-brand-dark placeholder-slate-400 text-sm"
              />
            </Field>
            <Field label="Date (optional)">
              <input
                type="date"
                value={form.eventDate}
                onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                className="w-full p-3 bg-[#f5f2ed] border border-slate-200 rounded-xl outline-none focus:border-[#c9973a] transition-all text-brand-dark text-sm"
              />
            </Field>
          </div>

          <Field label="Description (optional)">
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Crowd size, setup, what made it memorable…"
              maxLength={2000}
              rows={3}
              className="w-full p-3 bg-[#f5f2ed] border border-slate-200 rounded-xl outline-none focus:border-[#c9973a] transition-all text-brand-dark placeholder-slate-400 text-sm resize-none"
            />
          </Field>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-[13px] text-red-600">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          </div>

          {/* Sticky footer keeps the action buttons visible regardless of
              how tall the form gets — previously buried below
              max-h-[70vh] overflow-y-auto so users only saw Cancel. */}
          <div className="px-6 sm:px-7 py-4 border-t border-slate-100 bg-white flex flex-col-reverse sm:flex-row gap-2">
            <button
              type="button"
              onClick={onClose}
              className="sm:flex-1 px-4 py-3 bg-[#f5f2ed] text-brand-dark border border-slate-200 rounded-xl font-bold text-sm hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="sm:flex-[2] px-4 py-3 bg-[#c9973a] text-white rounded-xl font-bold text-sm shadow-lg shadow-[#c9973a]/30 hover:brightness-110 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {editing ? 'Save changes' : 'Add to catalog'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function PreviewModal({ item, onClose }: { item: PortfolioItem; onClose: () => void }) {
  const videoId = extractYouTubeId(item.youtubeUrl);
  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        className="relative w-full max-w-3xl bg-white rounded-2xl shadow-xl overflow-hidden"
      >
        <div className="flex items-start justify-between px-5 py-3 border-b border-slate-100">
          <div className="min-w-0">
            <h3 className="font-bold text-brand-dark text-[15px] truncate">{item.title}</h3>
            {item.eventName && (
              <p className="text-[11px] text-slate-500 truncate">{item.eventName}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 hover:bg-[#f5f2ed] rounded-full text-slate-500 transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="aspect-video bg-black">
          {videoId ? (
            <iframe
              src={youTubeEmbedUrl(videoId) + '&autoplay=1'}
              title={item.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white text-sm">
              Couldn&apos;t parse a YouTube ID from this URL.
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
        {label}
        {required && <span className="text-[#c9973a]">*</span>}
      </label>
      {children}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20 text-slate-400">
      <Loader2 className="w-6 h-6 animate-spin mr-2" />
      <span className="text-sm">Loading your catalog…</span>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-20 text-red-500 gap-2 text-sm">
      <AlertTriangle className="w-5 h-5" />
      {message}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-dashed border-slate-300">
      <div className="w-16 h-16 bg-[#f5f2ed] rounded-full flex items-center justify-center mb-4 text-[#c9973a]">
        <Music className="w-8 h-8" />
      </div>
      <h3 className="font-bold text-brand-dark text-base">Your catalog is empty</h3>
      <p className="text-slate-500 text-[13px] mt-1 max-w-sm">
        Add YouTube clips of past gigs so buyers reviewing your quotes can hear and see what they&apos;re booking.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-5 inline-flex items-center gap-2 px-4 py-3 bg-[#c9973a] text-white rounded-xl font-bold text-sm shadow-lg shadow-[#c9973a]/30 hover:brightness-110 active:scale-[0.99] transition-all"
      >
        <Plus className="w-4 h-4" strokeWidth={2.5} />
        Add your first performance
      </button>
    </div>
  );
}

function formatEventDate(iso: string): string {
  // YYYY-MM-DD → "May 11, 2026" without pulling in extra date helpers.
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const month = months[parseInt(m[2], 10) - 1] ?? '';
  return `${month} ${parseInt(m[3], 10)}, ${m[1]}`;
}
