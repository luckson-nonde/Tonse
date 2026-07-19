/**
 * Technician workspace — the "My Jobs" / "History" tabs of the technician
 * dashboard. Lists jobs assigned to the signed-in technician and, per job,
 * captures BEFORE/AFTER service evidence: photos (compressed, native camera
 * capture) and one short video per phase, uploaded through
 * POST /files/upload?category=job-evidence then recorded via /jobs/:id/media.
 *
 * Owners reuse this read-only-ish surface too (they can also capture), but
 * its primary user is the technician on a phone at the vehicle.
 *
 * Border colors are opaque hexes on purpose — translucent borders on rounded
 * cards mis-rasterize on Mali-GPU Android phones.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  Car,
  ChevronDown,
  Loader2,
  MapPin,
  Video,
  User as UserIcon,
} from 'lucide-react';
import { API_BASE_URL, apiClient } from '../../services/api/client';
import { jobsService, JobRecord, JobMediaRecord } from '../../services/api/jobsService';
import { compressImage } from '../../utils/compressImage';

const MAX_VIDEO_BYTES = 40 * 1024 * 1024;

const isVideoUrl = (src: string) => /\.(mp4|webm|mov|avi|3gp)$/i.test(src);

const STATUS_STYLES: Record<string, string> = {
  PAID: 'bg-[#fdf6e9] text-[#8a6118]',
  PENDING_COLLECTION: 'bg-[#fdf6e9] text-[#8a6118]',
  AWAITING_PICKUP: 'bg-[#eef4ff] text-[#3556a8]',
  COMPLETED: 'bg-[#e9f8f0] text-[#1c7a4d]',
  HANDED_OVER: 'bg-[#e9f8f0] text-[#1c7a4d]',
};

/** The vehicle/asset identity chips shown on a job card, pulled from the
 *  inquiry's schema attributes (Key Replacement's Vehicle Details group). */
function vehicleChips(attributes: Record<string, any>): string[] {
  const chips: string[] = [];
  const make = attributes?.vehicleMake;
  const model = attributes?.vehicleModel;
  const year = attributes?.vehicleYear;
  const vin = attributes?.vin;
  const brand = attributes?.lockBrand;
  if (make || model) chips.push([make, model].filter(Boolean).join(' '));
  if (year) chips.push(String(year));
  if (vin) chips.push(`VIN ${vin}`);
  if (!chips.length && brand) chips.push(String(brand));
  return chips;
}

function EvidenceSection({
  job,
  phase,
  media,
  disabled,
  onCaptured,
}: {
  job: JobRecord;
  phase: 'BEFORE' | 'AFTER';
  media: JobMediaRecord[];
  disabled: boolean;
  onCaptured: () => void;
}) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<'photo' | 'video' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const phaseMedia = media.filter((m) => m.phase === phase);
  const hasVideo = phaseMedia.some((m) => m.mediaType === 'VIDEO');

  const upload = useCallback(
    async (file: File, mediaType: 'IMAGE' | 'VIDEO') => {
      setError(null);
      setBusy(mediaType === 'IMAGE' ? 'photo' : 'video');
      try {
        const toSend = mediaType === 'IMAGE' ? await compressImage(file) : file;
        const formData = new FormData();
        formData.append('file', toSend);
        const response = await apiClient.post<{ url: string }>(
          '/files/upload?category=job-evidence',
          formData,
        );
        const fileUrl = response.data?.url;
        if (!fileUrl) throw new Error('Upload did not return a URL');
        await jobsService.addMedia(job.id, {
          phase,
          mediaType,
          url: `${API_BASE_URL}${fileUrl}`,
        });
        onCaptured();
      } catch (e: any) {
        setError(e?.message || 'Upload failed — check your connection and try again.');
      } finally {
        setBusy(null);
      }
    },
    [job.id, phase, onCaptured],
  );

  const onPhotoPicked = (files: FileList | null) => {
    if (!files?.length) return;
    upload(files[0], 'IMAGE');
  };

  const onVideoPicked = (files: FileList | null) => {
    if (!files?.length) return;
    const file = files[0];
    if (file.size > MAX_VIDEO_BYTES) {
      setError('That video is over 40MB — keep it under ~30 seconds and try again.');
      return;
    }
    upload(file, 'VIDEO');
  };

  return (
    <div className="rounded-2xl border border-[#ecd9b3] bg-[#fdfaf2] p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6118]">
          {phase === 'BEFORE' ? 'Before service' : 'After service'}
        </p>
        <p className="text-[10px] font-bold text-slate-400">
          {phaseMedia.length ? `${phaseMedia.length} captured` : 'Nothing yet'}
        </p>
      </div>

      {phaseMedia.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
          {phaseMedia.map((m) =>
            m.mediaType === 'VIDEO' || isVideoUrl(m.url) ? (
              <video
                key={m.id}
                src={m.url}
                controls
                preload="metadata"
                className="w-full h-20 object-cover rounded-xl bg-black col-span-2"
              />
            ) : (
              <a key={m.id} href={m.url} target="_blank" rel="noreferrer">
                <img
                  src={m.url}
                  alt={`${phase} evidence`}
                  loading="lazy"
                  className="w-full h-20 object-cover rounded-xl"
                />
              </a>
            ),
          )}
        </div>
      )}

      {!disabled && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => photoInputRef.current?.click()}
            disabled={busy !== null}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1a1a2e] text-white text-[11px] font-black uppercase tracking-wider hover:bg-[#C9973A] transition-all disabled:opacity-60"
          >
            {busy === 'photo' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Camera className="w-3.5 h-3.5" />
            )}
            Add photo
          </button>
          <button
            onClick={() => videoInputRef.current?.click()}
            disabled={busy !== null || hasVideo}
            title={hasVideo ? 'One video per phase' : undefined}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#d8c08a] bg-white text-[#8a6118] text-[11px] font-black uppercase tracking-wider hover:bg-[#fdf6e9] transition-all disabled:opacity-50"
          >
            {busy === 'video' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Video className="w-3.5 h-3.5" />
            )}
            {hasVideo ? 'Video added' : 'Short video'}
          </button>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              onPhotoPicked(e.target.files);
              e.target.value = '';
            }}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              onVideoPicked(e.target.files);
              e.target.value = '';
            }}
          />
        </div>
      )}
      {busy === 'video' && (
        <p className="mt-2 text-[11px] font-semibold text-slate-400">
          Uploading video — this can take a moment on mobile data…
        </p>
      )}
      {error && <p className="mt-2 text-[11px] font-semibold text-rose-500">{error}</p>}
    </div>
  );
}

export default function TechnicianJobsView({ historyOnly = false }: { historyOnly?: boolean }) {
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [mediaByJob, setMediaByJob] = useState<Record<string, JobMediaRecord[]>>({});

  const loadJobs = useCallback(async () => {
    try {
      setJobs(await jobsService.list(historyOnly ? 'history' : 'active'));
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [historyOnly]);

  useEffect(() => {
    setLoading(true);
    loadJobs();
  }, [loadJobs]);

  const loadMedia = useCallback(async (quoteId: string) => {
    try {
      const rows = await jobsService.media(quoteId);
      setMediaByJob((prev) => ({ ...prev, [quoteId]: rows }));
    } catch {
      /* section just shows empty */
    }
  }, []);

  const toggle = (job: JobRecord) => {
    const next = expandedId === job.id ? null : job.id;
    setExpandedId(next);
    if (next && !mediaByJob[job.id]) loadMedia(job.id);
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-[13px] font-semibold text-slate-400">
        Loading jobs…
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-[#ecd9b3] p-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#fdf6e9] flex items-center justify-center mx-auto mb-4">
          <Camera className="w-6 h-6 text-[#C9973A]" />
        </div>
        <p className="text-[15px] font-bold text-slate-900 mb-1">
          {historyOnly ? 'No completed jobs yet' : 'No jobs assigned yet'}
        </p>
        <p className="text-[13px] text-slate-500 max-w-sm mx-auto leading-relaxed">
          {historyOnly
            ? 'Jobs you captured evidence on will appear here once they complete.'
            : 'When the shop owner assigns you a job, it lands here with everything you need to capture the before & after.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {jobs.map((job) => {
        const expanded = expandedId === job.id;
        const chips = vehicleChips(job.attributes || {});
        const media = mediaByJob[job.id] ?? [];
        return (
          <div
            key={job.id}
            className="bg-white rounded-3xl border border-[#ecd9b3] shadow-sm overflow-hidden"
          >
            <button
              onClick={() => toggle(job)}
              className="w-full px-5 sm:px-6 py-4 flex items-center gap-4 text-left hover:bg-[#fdfaf2] transition-colors"
            >
              <div className="w-10 h-10 rounded-2xl bg-[#fdf6e9] flex items-center justify-center shrink-0">
                <Car className="w-5 h-5 text-[#C9973A]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-slate-900 truncate">{job.inquiryTitle}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                  {job.buyerName && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                      <UserIcon className="w-3 h-3" />
                      {job.buyerName}
                    </span>
                  )}
                  {job.location && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                      <MapPin className="w-3 h-3" />
                      {job.location}
                    </span>
                  )}
                </div>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 ${
                  STATUS_STYLES[job.status] ?? 'bg-[#f4f4f6] text-[#5b5b6b]'
                }`}
              >
                {job.status.replace(/_/g, ' ')}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
              />
            </button>

            {expanded && (
              <div className="px-5 sm:px-6 pb-5 space-y-4 border-t border-[#f3ead6] pt-4">
                {chips.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {chips.map((chip) => (
                      <span
                        key={chip}
                        className="px-3 py-1 rounded-full bg-[#f4f4f6] text-[10px] font-black uppercase tracking-wider text-[#5b5b6b]"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                )}
                <EvidenceSection
                  job={job}
                  phase="BEFORE"
                  media={media}
                  disabled={historyOnly}
                  onCaptured={() => loadMedia(job.id)}
                />
                <EvidenceSection
                  job={job}
                  phase="AFTER"
                  media={media}
                  disabled={historyOnly}
                  onCaptured={() => loadMedia(job.id)}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
