/**
 * Alignment outlines for guided photo capture.
 *
 * The buyer lines their face / hand / head / foot up to one of these before
 * shooting, then sees the captured photo back BEHIND the same outline to
 * check the framing. That before/after comparison is the whole point of the
 * guide, so the identical drawing is used in both places — mini inside the
 * empty slot tile, full size on the capture sheet's stage.
 *
 * Drawn inline (no image requests, scales to any tile size). The stroke is an
 * OPAQUE hex dimmed via the SVG `opacity` attribute — deliberately not a
 * translucent Tailwind border, which mis-rasterizes on Mali-GPU Android
 * phones (see .claude/skills/android-gpu-ghosting).
 */

export type GuideKind = 'face' | 'hands' | 'hair' | 'feet' | 'inspo';

const GOLD = '#C9973A';

/** Shared stroke setup — every path is an unfilled, round-capped outline. */
const stroke = {
  stroke: GOLD,
  fill: 'none',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/** Dotted alignment rails (eye line, centre line, floor line). */
const DASH = '7 7';

function GuideBody({ kind }: { kind: GuideKind }) {
  switch (kind) {
    case 'face':
      return (
        <>
          <ellipse cx="150" cy="176" rx="86" ry="110" {...stroke} strokeWidth="2.2" />
          {/* shoulders */}
          <path d="M126 284v20c0 14-26 20-52 26M174 284v20c0 14 26 20 52 26" {...stroke} strokeWidth="2" />
          {/* eye line + centre line */}
          <line x1="64" y1="164" x2="236" y2="164" {...stroke} strokeWidth="1.4" strokeDasharray={DASH} />
          <line x1="150" y1="72" x2="150" y2="286" {...stroke} strokeWidth="1.4" strokeDasharray={DASH} />
          <circle cx="120" cy="164" r="9" {...stroke} strokeWidth="1.8" />
          <circle cx="180" cy="164" r="9" {...stroke} strokeWidth="1.8" />
          <path d="M106 146q14 -9 28 -3M166 143q14 -6 28 3" {...stroke} strokeWidth="1.8" />
          <path d="M132 232q18 12 36 0" {...stroke} strokeWidth="1.8" />
        </>
      );

    case 'hands':
      return (
        <>
          <path
            d="M 106 372 L 102 300 C 100 292 107 277 107 277 L 51 213 A 14 14 0 0 1 29 231 L 85 295 C 104 262 108 252 133 233 L 111 115 A 15 15 0 0 1 81 121 L 103 239 Q 136 247 168 228 L 164 82 A 16 16 0 0 1 132 82 L 136 228 Q 168 241 201 233 L 211 101 A 15 15 0 0 1 181 99 L 171 231 Q 200 257 229 249 L 253 155 A 13 13 0 0 1 227 149 L 203 243 C 238 268 236 300 234 372 Z"
            {...stroke}
            strokeWidth="2.4"
          />
          <line x1="78" y1="372" x2="262" y2="372" {...stroke} strokeWidth="1.4" strokeDasharray={DASH} />
        </>
      );

    case 'hair':
      return (
        <>
          <ellipse cx="150" cy="178" rx="98" ry="118" {...stroke} strokeWidth="2.2" />
          <path d="M52 296c-14 30-22 62-24 104M248 296c14 30 22 62 24 104" {...stroke} strokeWidth="2" />
          <line x1="150" y1="60" x2="150" y2="296" {...stroke} strokeWidth="1.4" strokeDasharray={DASH} />
          <path d="M76 150q74 -46 148 0" {...stroke} strokeWidth="1.6" strokeDasharray={DASH} />
        </>
      );

    case 'feet':
      return (
        <>
          <path
            d="M 95 142 A 21 21 0 1 1 137 134 Q 138 142 139 112 A 13 13 0 0 1 165 116 Q 166 125 166 116 A 11 11 0 0 1 188 120 Q 188 133 188 125 A 10 10 0 0 1 208 129 Q 208 146 207 138 A 9 9 0 0 1 225 142 C 232 170 226 210 216 248 C 208 292 206 318 190 338 A 42 40 0 0 1 112 332 C 100 300 96 240 98 196 C 96 176 94 158 95 142 Z"
            {...stroke}
            strokeWidth="2.4"
          />
          <line x1="60" y1="368" x2="240" y2="368" {...stroke} strokeWidth="1.4" strokeDasharray={DASH} />
        </>
      );

    // Inspiration slot: no body part to line up, so just a picture frame.
    case 'inspo':
    default:
      return (
        <>
          <rect x="58" y="98" width="184" height="204" rx="14" {...stroke} strokeWidth="2" strokeDasharray={DASH} />
          <path d="M112 240l34-40 28 32 20-22 34 42H112z" {...stroke} strokeWidth="2" />
          <circle cx="124" cy="160" r="13" {...stroke} strokeWidth="2" />
        </>
      );
  }
}

export default function GuideOutline({
  kind,
  opacity = 1,
  className,
}: {
  kind: GuideKind;
  opacity?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 300 400"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      opacity={opacity}
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      <GuideBody kind={kind} />
    </svg>
  );
}
