import React from 'react';

interface TipItem {
  icon: React.ReactNode;
  text: React.ReactNode;
}

interface RegistrationStepShellProps {
  /** Small uppercase label above the title — e.g. "Step 02 / Where". */
  eyebrow: string;
  /** Big serif title for the step. */
  title: string;
  /** One-line description under the title. */
  description: string;
  /** Lucide icon (rendered at 32px inside the gold-tinted square). */
  icon: React.ReactNode;
  /** Optional bullet list shown ONLY at lg+ in the left context panel. */
  tips?: TipItem[];
  /** Optional advisory banner rendered above the children — used by
   *  the Location step's "Be at your shop" notice. Renders on every
   *  breakpoint; the shell doesn't move it into the left panel
   *  because it's stronger as a banner than as a sidebar bullet. */
  advisory?: React.ReactNode;
  /** The step's actual form body. */
  children: React.ReactNode;
}

/**
 * Two-column-on-desktop registration step shell. Mobile/tablet stay as
 * a single vertical column; at lg+ a sticky context panel appears on
 * the left (eyebrow / icon / title / description / tips) and the form
 * card takes the remaining width on the right.
 *
 * Pattern lifted from DynamicInquiryForm's left-tip + right-form-card
 * layout so the registration and inquiry surfaces share one visual
 * language. AuthSplitLayout's right pane was widened to give this
 * shell real horizontal room (max-w expands from 440 → 560 → 860 →
 * 1040 across breakpoints).
 */
export default function RegistrationStepShell({
  eyebrow,
  title,
  description,
  icon,
  tips,
  advisory,
  children,
}: RegistrationStepShellProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-12 items-start">
      {/* No mobile/tablet header here by design. The parent AuthSplitLayout
          already renders the step title, subtitle, stepper and back control
          on small screens — rendering them again duplicated the title and
          cluttered the mobile view. Mobile now goes straight to the form for
          a clean, professional layout; the context panel below is desktop-only. */}

      {/* ────── Desktop left context panel (lg+) ────── */}
      <aside className="hidden lg:flex flex-col gap-6 w-full lg:w-[340px] xl:w-[380px] shrink-0 sticky top-12">
        <div className="space-y-4">
          <div className="w-16 h-16 bg-[#C9973A]/10 rounded-2xl flex items-center justify-center text-[#C9973A]">
            {icon}
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#C9973A]">
            {eyebrow}
          </p>
          <h2 className="font-serif text-[32px] xl:text-[36px] font-bold text-[#1a1a2e] leading-[1.05]">
            {title}
          </h2>
          <p className="text-[14px] text-[#1a1a2e]/60 leading-relaxed font-medium">
            {description}
          </p>
        </div>

        {tips && tips.length > 0 && (
          <div className="bg-gradient-to-br from-[#fdf6e9]/70 to-[#fdf6e9]/30 border border-[#C9973A]/15 rounded-[24px] p-6">
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#C9973A] mb-4">
              Why this matters
            </p>
            <ul className="space-y-3">
              {tips.map((tip, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="text-[#C9973A] shrink-0 mt-0.5">{tip.icon}</span>
                  <p className="text-[12px] text-[#1a1a2e]/80 leading-relaxed">{tip.text}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>

      {/* ────── Right form card (all breakpoints) ────── */}
      <div className="flex-1 w-full min-w-0">
        {advisory && <div className="mb-5">{advisory}</div>}
        <div className="bg-white border border-[#e8e0d0]/60 rounded-[28px] p-5 sm:p-6 md:p-8 xl:p-10 shadow-[0_4px_24px_-8px_rgba(26,26,46,0.08)]">
          {children}
        </div>
      </div>
    </div>
  );
}
