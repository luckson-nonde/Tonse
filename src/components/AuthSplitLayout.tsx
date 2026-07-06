import React from 'react';
import { ArrowLeft } from 'lucide-react';
import Logo from './Logo';
import MarketplaceShowcase from './MarketplaceShowcase';

interface AuthSplitLayoutProps {
  children: React.ReactNode;
  /** Title and subtitle render the shell's default `<h2>` header on the
   *  right pane. Optional because Login (and any future page that wants
   *  to render its own minimal header) opts out via `hideHeader`. */
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  onBack?: () => void;
  stepper?: {
    current: number;
    total: number;
    labels: string[];
    /** When provided, completed steps become clickable to jump back to them. */
    onStepClick?: (step: number) => void;
  };
  /** Right-pane background tone. `'cream'` (#fffaf5) is the legacy
   *  default used by every multi-step registration surface. `'white'`
   *  (#ffffff) is the premium B2B treatment used by Login — neutralises
   *  the warm tint that conflicts with the trade-portal voice. */
  paneTone?: 'cream' | 'white';
  /** When true, the shell's default 40-44px serif `<h2>` + cream-divider
   *  header is suppressed. Callers render their own header inside
   *  `children`. Required for Login to avoid the duplicate-headline
   *  problem (hero already carries "Welcome back to the gold standard"). */
  hideHeader?: boolean;
  /** When true, the shell's absolute-positioned compliance footer
   *  ("ZRA-compliant · Escrow-protected · ISO 27001") is suppressed.
   *  Callers may then render the same trio in-flow next to the primary
   *  CTA — visual proximity to the decision point reads more premium
   *  than the exiled bottom-corner version. */
  trustBand?: boolean;
}

export default function AuthSplitLayout({
  children,
  title,
  subtitle,
  onBack,
  stepper,
  paneTone = 'cream',
  hideHeader = false,
  trustBand = false,
}: AuthSplitLayoutProps) {
  // Pane tone resolution: every existing caller (Register, RoleSelection,
  // CompanyDocuments, CategorySelection, LabourRegister) takes the cream
  // default — byte-identical to the prior behaviour. Login opts in to
  // pure white.
  const paneBg = paneTone === 'white' ? 'bg-white' : 'bg-brand-white';
  const wrapperBg = paneTone === 'white' ? 'bg-white' : 'bg-brand-white';

  return (
    <div className={`min-h-screen flex flex-col lg:flex-row font-sans ${wrapperBg}`}>
      {/* Left Pane — permanent marketplace showcase. Identical across
          Login and every registration step (that's the point: navigating
          between auth states reads as "only the right column changed").
          Sticky so it stays put while a long right column scrolls. */}
      <div className="hidden lg:block lg:w-[42%] lg:sticky lg:top-0 lg:h-screen overflow-hidden">
        <MarketplaceShowcase variant="panel" />
      </div>

      {/* Right Pane (Form) */}
      <div className={`w-full lg:w-[58%] flex flex-col justify-center items-center px-5 md:px-8 lg:px-12 ${paneBg} min-h-screen relative`}>
        {/* Subtle gold haze top-right — kept for cream pane, dropped
            for the white pane (premium prefers a flat white surface). */}
        {paneTone === 'cream' && (
          <>
            <div className="hidden lg:block absolute top-0 right-0 w-[600px] h-[600px] bg-[#C9973A]/[0.06] rounded-full blur-3xl pointer-events-none" />
            <div className="hidden lg:block absolute bottom-0 left-0 w-[400px] h-[400px] bg-brand-dark/[0.03] rounded-full blur-3xl pointer-events-none" />
          </>
        )}

        {/* Compliance footer — anchors the negative space.
            Suppressed when `trustBand` is set so the caller can pull
            the same trio in-flow next to its primary CTA (premium puts
            trust signals at the decision moment, not in a footer). */}
        {!trustBand && (
          <div className="hidden lg:flex absolute bottom-8 left-12 right-12 items-center justify-between text-[11px] font-medium text-[#1a1612]/35 pointer-events-none">
            <div className="flex items-center gap-5">
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-[#C9973A]" />
                ZRA-compliant
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-[#C9973A]" />
                Escrow-protected
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-[#C9973A]" />
                ISO 27001
              </span>
            </div>
            <span className="font-serif italic text-[#1a1612]/40">Tonse · Lusaka</span>
          </div>
        )}

        {/* Responsive form column. Used to be a fixed max-w-[440px]
            on every breakpoint, which left ~60% of the right pane
            empty on desktop and forced multi-step forms (Location,
            Categories) into a cramped single column. Steps that
            opt into the 2-column layout via RegistrationStepShell
            need real horizontal room at lg+; this scaling provides
            it without stretching the simple steps awkwardly. */}
        <div className="w-full max-w-[440px] md:max-w-[560px] lg:max-w-[860px] xl:max-w-[1040px] relative z-10 py-10 lg:py-16">
          {/* Mobile Header (Logo + Back) */}
          <div className="lg:hidden flex items-center justify-center relative mb-10">
            {onBack && (
              <button
                onClick={onBack}
                className="absolute left-0 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <Logo className="text-3xl" />
          </div>

          {/* Progress — one continuous bar filling toward completion. No
              step counter or "X of Y"; just a calm sense of how far along. */}
          {stepper && (
            <div className="mb-10">
              <div className="h-1.5 bg-[#e8e4dc] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#C9973A] to-[#D5A547] rounded-full transition-[width] duration-500 ease-out"
                  style={{ width: `${(stepper.current / stepper.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Header Section.
              Suppressed when `hideHeader` is set so the caller renders
              its own minimal header inside `children`. Login uses this
              path to drop the duplicate "Welcome Back" headline that
              competed with the hero's "Welcome back to the gold
              standard." */}
          {!hideHeader && (
            <div className="flex flex-col mb-10 gap-3">
              {onBack && (
                <button
                  onClick={onBack}
                  className="hidden lg:flex items-center text-slate-400 hover:text-slate-600 transition-colors text-[13px] font-sans font-medium w-fit group mb-2"
                >
                  <ArrowLeft className="w-4 h-4 mr-1.5 group-hover:-translate-x-1 transition-transform" />
                  Back
                </button>
              )}
              <h2 className="text-[24px] sm:text-[34px] lg:text-[44px] font-serif font-bold text-brand-dark leading-[1.1] lg:leading-[1.05] tracking-tight">
                {title}
              </h2>
              <div className="flex items-center gap-3">
                <div className="h-[2px] w-10 bg-[#C9973A] rounded-full" />
                <p className="text-[14px] font-sans font-medium text-[#1a1612]/55 leading-relaxed">
                  {subtitle}
                </p>
              </div>
            </div>
          )}

          {children}
        </div>
      </div>
    </div>
  );
}
