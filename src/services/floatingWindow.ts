/**
 * Always-on-top desktop widget via the Document Picture-in-Picture API
 * (Chromium 116+ on Windows/macOS/Linux — Chrome & Edge).
 *
 * Unlike classic (video-only) PiP, Document PiP hosts ARBITRARY HTML in a
 * window the OS keeps above every other application — which is exactly the
 * "float like a widget over Windows" behaviour a plain PWA can't get any
 * other way (no system-overlay permission exists on desktop).
 *
 * Plain module (not a hook), mirroring pushService/installPrompt:
 * FloatingHub calls openFloatingWindow() from the minimize CLICK (the API
 * requires a user gesture) and pushes live count updates in afterwards.
 *
 * The PiP document starts with no stylesheets, so the card is built with
 * inline styles — deliberately self-contained; no Tailwind copying.
 */

interface OpenOptions {
  unread: number;
  /** User clicked "Open ProQuote" in the widget — restore the app. */
  onRestore: () => void;
  /** The PiP window went away (user closed it, or we closed it). */
  onClosed?: () => void;
}

let pipWindow: Window | null = null;
let badgeEl: HTMLSpanElement | null = null;
let statusEl: HTMLParagraphElement | null = null;

export function isFloatingWindowSupported(): boolean {
  return typeof window !== 'undefined' && 'documentPictureInPicture' in window;
}

export function isFloatingWindowOpen(): boolean {
  return pipWindow !== null && !pipWindow.closed;
}

function statusText(unread: number): string {
  if (unread <= 0) return 'No new inquiries yet — listening…';
  return unread === 1 ? '1 new inquiry waiting' : `${unread} new inquiries waiting`;
}

/** Live-update the widget's badge + status line (no-op when not open). */
export function updateFloatingWindow(unread: number): void {
  if (!isFloatingWindowOpen()) return;
  if (badgeEl) {
    badgeEl.textContent = unread > 99 ? '99+' : String(unread);
    badgeEl.style.display = unread > 0 ? 'inline-flex' : 'none';
  }
  if (statusEl) statusEl.textContent = statusText(unread);
}

export function closeFloatingWindow(): void {
  try {
    pipWindow?.close();
  } catch {
    /* already gone */
  }
  pipWindow = null;
  badgeEl = null;
  statusEl = null;
}

/**
 * Open the always-on-top widget. MUST be called from a user gesture (click).
 * Resolves true when the window is up; false when unsupported/blocked.
 */
export async function openFloatingWindow(opts: OpenOptions): Promise<boolean> {
  if (!isFloatingWindowSupported()) return false;
  if (isFloatingWindowOpen()) {
    updateFloatingWindow(opts.unread);
    return true;
  }

  try {
    pipWindow = await (window as any).documentPictureInPicture.requestWindow({
      width: 330,
      height: 200,
    });
  } catch {
    pipWindow = null;
    return false; // no user activation / user blocked it
  }

  const doc = pipWindow!.document;
  doc.title = 'ProQuote — background';

  const el = <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    css: string,
    text?: string
  ): HTMLElementTagNameMap[K] => {
    const node = doc.createElement(tag);
    node.style.cssText = css;
    if (text) node.textContent = text;
    return node;
  };

  doc.body.style.cssText =
    'margin:0;font-family:"Segoe UI",system-ui,-apple-system,sans-serif;' +
    'background:#1B3068;color:#fff;height:100vh;display:flex;flex-direction:column;' +
    'justify-content:center;padding:16px 18px;box-sizing:border-box;overflow:hidden;' +
    'background-image:radial-gradient(120% 140% at 85% -20%, rgba(201,151,58,.28), transparent 55%);';

  // Header row: monogram + name + live badge
  const row = el('div', 'display:flex;align-items:center;gap:10px;');
  const monogram = el(
    'div',
    'width:38px;height:38px;border-radius:11px;background:rgba(255,255,255,.07);' +
      'border:1px solid rgba(201,151,58,.55);display:flex;align-items:center;justify-content:center;' +
      'font-family:Georgia,serif;font-size:22px;font-weight:700;color:#c9973a;flex:none;',
    'T'
  );
  const nameWrap = el('div', 'flex:1;min-width:0;');
  nameWrap.appendChild(
    el('div', 'font-size:14px;font-weight:700;letter-spacing:.01em;', 'ProQuote Zambia')
  );
  nameWrap.appendChild(
    el('div', 'font-size:11px;color:rgba(255,255,255,.55);', 'Running in the background')
  );
  badgeEl = el(
    'span',
    'min-width:22px;height:22px;padding:0 7px;border-radius:999px;background:#ef4444;' +
      'color:#fff;font-size:12px;font-weight:700;display:none;align-items:center;justify-content:center;flex:none;'
  );
  row.appendChild(monogram);
  row.appendChild(nameWrap);
  row.appendChild(badgeEl);

  // Status line
  statusEl = el(
    'p',
    'margin:14px 0 0;font-size:13px;line-height:1.45;color:rgba(255,255,255,.8);',
    statusText(opts.unread)
  );

  // Return button — handler runs in THIS (main window) JS context, so from the
  // click's user activation we can raise the opener tab and restore the app.
  const button = el(
    'button',
    'margin-top:14px;padding:9px 0;width:100%;border:none;border-radius:10px;' +
      'background:#c9973a;color:#1B3068;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;'
  );
  button.textContent = 'Open ProQuote';
  button.addEventListener('click', () => {
    try {
      window.focus(); // the documented Doc-PiP "back to tab" pattern
    } catch {
      /* best-effort */
    }
    opts.onRestore();
    closeFloatingWindow();
  });

  doc.body.appendChild(row);
  doc.body.appendChild(statusEl);
  doc.body.appendChild(button);

  updateFloatingWindow(opts.unread);

  pipWindow!.addEventListener('pagehide', () => {
    pipWindow = null;
    badgeEl = null;
    statusEl = null;
    opts.onClosed?.();
  });

  return true;
}
