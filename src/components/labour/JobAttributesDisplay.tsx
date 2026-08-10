import { Briefcase } from 'lucide-react';
import {
  getJobSpecifications,
  getSeekerRequirements,
  getVacancyDetails,
} from '../../services/labourFormSchema';

/**
 * The body of a job post, rendered identically wherever a posting is shown:
 * the seeker's feed card, the poster's own posting detail, and the admin
 * review queue. One component because the three surfaces must agree on what
 * a job says — they previously ran three byte-identical copies of this JSX.
 *
 * Two shapes are supported. Postings from the vacancy composer render as a
 * real ad (employment type, pay note, Key Responsibilities and Minimum
 * Requirements as bulleted lists); LEGACY postings — created before the
 * composer, carrying per-trade inquiry answers — fall back to the flat
 * specifications grid. Applicant requirements ("You'll need") apply to both.
 */
interface JobAttributesDisplayProps {
  tradeId: string | undefined;
  attributes: Record<string, any> | null | undefined;
  /** Tighter padding for the admin queue's denser cards. */
  dense?: boolean;
}

export default function JobAttributesDisplay({
  tradeId,
  attributes,
  dense,
}: JobAttributesDisplayProps) {
  const vacancy = getVacancyDetails(attributes);
  // Legacy postings only — a vacancy's reserved keys are blocklisted out of
  // getJobSpecifications anyway, but skipping the call makes that explicit.
  const specs = vacancy ? [] : getJobSpecifications(tradeId, attributes);
  const requirements = getSeekerRequirements(attributes);

  if (!vacancy && specs.length === 0 && requirements.length === 0) return null;

  const pad = dense ? 'px-3 py-2.5' : 'px-3.5 py-3';
  const gap = dense ? 'mt-2' : 'mt-3';

  const bulletBlock = (title: string, items: string[]) =>
    items.length === 0 ? null : (
      <div className={`${gap} rounded-xl border border-[#eef2f6] bg-[#fbfaf7] ${pad}`}>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
          {title}
        </p>
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li key={`${i}-${item}`} className="flex gap-2 text-[12px] text-slate-700">
              <span
                className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-[#C9973A]"
                aria-hidden
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    );

  return (
    <>
      {vacancy && (vacancy.employmentType || vacancy.payNote) && (
        <div className={`${gap} flex flex-wrap items-center gap-2`}>
          {vacancy.employmentType && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-[#8a6420] bg-[#fdf6e9] border border-[#f0dfc0] px-2.5 py-1 rounded-full">
              <Briefcase className="w-3 h-3" />
              {vacancy.employmentType}
            </span>
          )}
          {vacancy.payNote && (
            <span className="text-[12px] italic text-slate-500">{vacancy.payNote}</span>
          )}
        </div>
      )}

      {vacancy && bulletBlock('Key Responsibilities', vacancy.responsibilities)}
      {vacancy && bulletBlock('Minimum Requirements', vacancy.minimumRequirements)}

      {specs.length > 0 && (
        <div className={`${gap} rounded-xl border border-[#eef2f6] bg-[#fbfaf7] ${pad}`}>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
            Job specifications
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
            {specs.map((r) => (
              <div key={r.label} className="flex items-baseline gap-2 text-[12px]">
                <span className="text-slate-500">{r.label}:</span>
                <span className="font-bold text-slate-700">{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {requirements.length > 0 && (
        <div className={`${gap} rounded-xl border border-[#f0dfc0] bg-[#fdf9f0] ${pad}`}>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#a87b28] mb-2">
            You'll need
          </p>
          <div className="space-y-1.5">
            {requirements.map((r) => (
              <div key={r.label} className="flex items-baseline gap-2 text-[12px]">
                <span className="text-[#a87b28]">{r.label}:</span>
                <span className="font-bold text-slate-700">{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
