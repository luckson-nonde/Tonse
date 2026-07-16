import React, { useEffect, useState } from 'react';
import { FileText, Loader2, AlertTriangle } from 'lucide-react';
import { API_BASE_URL, tokenManager } from '../services/api/client';

/**
 * Loads a SENSITIVE, auth-gated file (`/files/secure/...`) with the Bearer
 * token and renders it from an in-memory object URL. Plain `<img src>` can't
 * send the auth header, so these encrypted documents (payslips, NRC/licence
 * images, bank statements) are fetched here instead of being publicly linked.
 *
 * `url` may be a full URL or a `/files/secure/<name>` path. Non-secure URLs
 * (ordinary public `/uploads/...`) are rendered directly.
 */
export function isSecureFileUrl(v: unknown): v is string {
  return typeof v === 'string' && v.includes('/files/secure/');
}

interface SecureFileProps {
  url: string;
  alt?: string;
  className?: string;
  /** Render as a compact "View document" link instead of an inline image. */
  asLink?: boolean;
}

export default function SecureFile({ url, alt = 'Document', className, asLink }: SecureFileProps) {
  const [objUrl, setObjUrl] = useState<string | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let revoked = false;
    let created: string | null = null;
    (async () => {
      try {
        setState('loading');
        // Resolve to an absolute URL against the API host.
        const idx = url.indexOf('/files/secure/');
        const path = idx >= 0 ? url.slice(idx) : url;
        const token = tokenManager.getAccessToken();
        const res = await fetch(`${API_BASE_URL}${path}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(String(res.status));
        const blob = await res.blob();
        if (revoked) return;
        created = URL.createObjectURL(blob);
        setObjUrl(created);
        setState('ready');
      } catch {
        if (!revoked) setState('error');
      }
    })();
    return () => {
      revoked = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [url]);

  if (asLink) {
    if (state === 'loading')
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
        </span>
      );
    if (state === 'error' || !objUrl)
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-rose-500">
          <AlertTriangle className="w-3.5 h-3.5" /> Unavailable
        </span>
      );
    return (
      <a
        href={objUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#C9973A] hover:underline"
      >
        <FileText className="w-3.5 h-3.5" /> View document
      </a>
    );
  }

  if (state === 'loading')
    return (
      <div className={`flex items-center justify-center bg-slate-50 text-slate-300 ${className || 'w-full h-40 rounded-xl'}`}>
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  if (state === 'error' || !objUrl)
    return (
      <div className={`flex items-center justify-center bg-rose-50 text-rose-400 ${className || 'w-full h-40 rounded-xl'}`}>
        <AlertTriangle className="w-5 h-5" />
      </div>
    );
  return <img src={objUrl} alt={alt} className={className || 'w-full rounded-xl'} />;
}
