import { useState } from 'react';
import { ArrowRight, Camera, Loader2 } from 'lucide-react';
import type { FieldSchema } from '../../services/categories';
import SecureFile, { isSecureFileUrl } from '../SecureFile';
import GuideOutline, { type GuideKind } from './guideSvgs';
import GuidedCaptureSheet from './GuidedCaptureSheet';

interface PhotoSlotPairProps {
  /** The primary (required) guided_capture field. */
  field: FieldSchema;
  /** Its partner slot — the optional inspiration photo. */
  partner?: FieldSchema;
  nowUrls: string[];
  inspirationUrls: string[];
  uploadingNow: boolean;
  uploadingInspiration: boolean;
  onCaptureNow: (file: File) => void;
  onCaptureInspiration: (file: File) => void;
  hasError?: boolean;
}

function SlotTile({
  guideKind,
  title,
  subtitle,
  badge,
  url,
  isUploading,
  isOptional,
  hasError,
  onClick,
}: {
  guideKind: GuideKind;
  title: string;
  subtitle: string;
  badge: string;
  url?: string;
  isUploading: boolean;
  isOptional?: boolean;
  hasError?: boolean;
  onClick: () => void;
}) {
  const filled = !!url;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={filled ? `${title} — photo added. Activate to change it.` : title}
      className={`relative w-full aspect-[3/4] rounded-2xl overflow-hidden flex flex-col items-center justify-center gap-2 text-center transition-colors ${
        filled
          ? 'border-[1.5px] border-[#e8e0d0] bg-white'
          : hasError
            ? 'border-[1.5px] border-dashed border-[#ef4444] bg-[#fdf6f5]'
            : isOptional
              ? 'border-[1.5px] border-dashed border-[#d9d2c4] bg-[#faf9f6] hover:border-[#C9973A]'
              : 'border-[1.5px] border-dashed border-[#d9d2c4] bg-[#fdf6e9] hover:border-[#C9973A]'
      }`}
    >
      {filled ? (
        <>
          {isSecureFileUrl(url!) ? (
            <SecureFile url={url!} alt={title} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          )}
          <span className="absolute left-2 top-2 rounded-full bg-[#1a1a2e]/85 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-white">
            {badge}
          </span>
          <span className="absolute bottom-2 right-2 rounded-full bg-[#1a1a2e]/85 px-2.5 py-1.5 text-[10px] font-semibold text-white">
            Change
          </span>
        </>
      ) : (
        <>
          <GuideOutline kind={guideKind} opacity={0.85} className="w-1/2 max-w-[86px] aspect-[3/4]" />
          <span className="px-2">
            <span className="block text-[12px] font-semibold text-[#1a1a2e] leading-tight">{title}</span>
            <span className="mt-1 block text-[10.5px] text-[#8a94a6] leading-tight">{subtitle}</span>
          </span>
        </>
      )}

      {isUploading && (
        <span className="absolute inset-0 flex items-center justify-center bg-white/75">
          <Loader2 className="w-6 h-6 text-[#C9973A] animate-spin" />
        </span>
      )}
    </button>
  );
}

/**
 * The "your photo now → the look you want" pair.
 *
 * Providers quote on the GAP between the two, which is why they sit side by
 * side rather than stacked in a generic gallery — and why only the left one is
 * required: the buyer's actual starting point is the thing no provider can
 * guess, while inspiration is a bonus.
 */
export default function PhotoSlotPair({
  field,
  partner,
  nowUrls,
  inspirationUrls,
  uploadingNow,
  uploadingInspiration,
  onCaptureNow,
  onCaptureInspiration,
  hasError,
}: PhotoSlotPairProps) {
  const [openSlot, setOpenSlot] = useState<'now' | 'inspiration' | null>(null);

  const nowUrl = nowUrls[0];
  const inspirationUrl = inspirationUrls[0];

  const tag = nowUrl
    ? inspirationUrl
      ? 'Both added'
      : '1 of 2 added'
    : `1 of 2 required`;

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-serif text-[15px] font-bold italic text-[#1a1a2e]">Now &rarr; After</p>
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8a94a6]">{tag}</span>
      </div>
      {field.helpText && <p className="mt-1 text-[12px] text-[#8a94a6]">{field.helpText}</p>}

      <div className="mt-3 grid grid-cols-[1fr_28px_1fr] items-center max-w-[440px]">
        <SlotTile
          guideKind={field.guideKind ?? 'face'}
          title={field.label}
          subtitle="Guided photo · required"
          badge="Now"
          url={nowUrl}
          isUploading={uploadingNow}
          hasError={hasError && !nowUrl}
          onClick={() => setOpenSlot('now')}
        />

        <span className="flex items-center justify-center text-[#cfcac0]" aria-hidden="true">
          <ArrowRight className="w-4 h-4" />
        </span>

        <SlotTile
          guideKind="inspo"
          title={partner?.label ?? 'The look you want'}
          subtitle="Inspiration · optional"
          badge="After"
          url={inspirationUrl}
          isUploading={uploadingInspiration}
          isOptional
          onClick={() => setOpenSlot('inspiration')}
        />
      </div>

      <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-[#8a94a6] max-w-[440px]">
        <Camera className="w-3.5 h-3.5 shrink-0" />
        We&rsquo;ll show you exactly where to line up.
      </p>

      <GuidedCaptureSheet
        open={openSlot === 'now'}
        guideKind={field.guideKind ?? 'face'}
        cameraFacing={field.cameraFacing ?? 'user'}
        title={field.label}
        lede={field.sheetLede ?? 'Fit yourself inside the outline before you shoot.'}
        tips={field.tips ?? []}
        showPrivacyNote
        onConfirm={onCaptureNow}
        onClose={() => setOpenSlot(null)}
      />

      <GuidedCaptureSheet
        open={openSlot === 'inspiration'}
        guideKind="inspo"
        cameraFacing="environment"
        title={partner?.label ?? 'Add your inspiration'}
        lede={partner?.sheetLede ?? 'A screenshot or saved photo of the result you want.'}
        tips={
          partner?.tips ?? [
            'Screenshots are fine',
            'Closer is better than a full-body shot',
            'Skip heavily filtered photos — they set the wrong expectation',
          ]
        }
        onConfirm={onCaptureInspiration}
        onClose={() => setOpenSlot(null)}
      />
    </div>
  );
}
