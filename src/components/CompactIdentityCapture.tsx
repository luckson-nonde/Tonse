import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, Check, X, AlertCircle, RefreshCw } from 'lucide-react';

interface CompactIdentityCaptureProps {
  value: string;
  onCapture: (imageData: string) => void;
}

export default function CompactIdentityCapture({ value, onCapture }: CompactIdentityCaptureProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {value ? (
        <div className="flex items-center gap-3 p-3.5 rounded-2xl border border-[#C9973A]/35 bg-white shadow-[0_4px_18px_-14px_rgba(201,151,58,0.5)]">
          <img
            src={value}
            alt=""
            className="w-12 h-12 rounded-xl object-cover ring-1 ring-[#C9973A]/20"
          />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600 mb-0.5 flex items-center gap-1.5">
              <Check className="w-3 h-3" strokeWidth={3} /> Identity Captured
            </p>
            <p className="text-[12px] font-medium text-[#1a1612]/60 leading-tight">
              Looks good — you're verified.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#C9973A] hover:text-[#B08432] transition-colors shrink-0"
          >
            Re-capture
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-[#e8e4dc] bg-brand-white hover:border-[#C9973A]/45 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-16px_rgba(26,22,18,0.15)] transition-all duration-200 text-left"
        >
          <div className="w-11 h-11 rounded-xl bg-[#C9973A]/10 text-[#C9973A] flex items-center justify-center shrink-0">
            <Camera className="w-5 h-5" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-[#1a1612] leading-tight">
              Live identity photo
            </p>
            <p className="text-[11px] text-[#1a1612]/55 mt-0.5">
              Quick selfie · matches your NRC · ~10 seconds
            </p>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#C9973A] shrink-0">
            Capture →
          </span>
        </button>
      )}

      {open && (
        <CameraModal
          onClose={() => setOpen(false)}
          onCapture={(img) => {
            onCapture(img);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

interface CameraModalProps {
  onClose: () => void;
  onCapture: (imageData: string) => void;
}

function CameraModal({ onClose, onCapture }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        });
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsReady(true);
      } catch (err) {
        console.error('Camera error:', err);
        setError('Could not access camera. Check browser permissions.');
      }
    })();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    return () => {
      mounted = false;
      stopStream();
      document.removeEventListener('keydown', onKey);
    };
  }, [stopStream, onClose]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    onCapture(dataUrl);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-dark/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[480px] bg-brand-white rounded-3xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#C9973A]">
              Identity Verification
            </p>
            <p className="text-[14px] font-serif font-bold text-[#1a1612] mt-0.5">
              Live identity photo
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-[#f5f2ee] hover:bg-[#e8e4dc] text-[#1a1612]/60 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative aspect-[4/5] bg-brand-dark mx-5 rounded-2xl overflow-hidden">
          {error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center mb-3">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-[13px] font-bold text-white mb-1">Camera unavailable</p>
              <p className="text-[11px] text-white/60 leading-relaxed max-w-[220px]">{error}</p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />

              {/* Center reticle */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-[60%] aspect-[3/4] border-2 border-white/40 rounded-[40%] border-dashed" />
              </div>

              {!isReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-brand-dark/40 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-white/80 text-[11px] font-bold uppercase tracking-[0.18em]">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Connecting camera…
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-5 py-5 flex items-center justify-between gap-3">
          <p className="text-[11px] text-[#1a1612]/55 leading-snug max-w-[220px]">
            Center your face inside the oval and look directly at the camera.
          </p>
          <button
            type="button"
            onClick={handleCapture}
            disabled={!isReady || !!error}
            className="shrink-0 group relative flex items-center justify-center"
            aria-label="Capture"
          >
            <span className="absolute inset-0 rounded-full bg-[#C9973A]/15 scale-150 group-hover:scale-[1.7] transition-transform" />
            <span className="relative w-14 h-14 rounded-full bg-white border-[5px] border-[#C9973A] shadow-lg flex items-center justify-center group-active:scale-90 disabled:opacity-50 transition-transform">
              <span className="w-5 h-5 rounded-full bg-[#C9973A]" />
            </span>
          </button>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
