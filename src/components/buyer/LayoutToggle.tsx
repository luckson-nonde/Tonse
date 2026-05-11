import { LayoutGrid, LayoutTemplate, List, Rows3, Sparkles, Tag, type LucideIcon } from 'lucide-react';
import type { MasterLayout, SubLayout } from './useLayoutPreference';

interface OptionDef<T extends string> {
  value: T;
  icon: LucideIcon;
  label: string;
}

const MASTER_OPTS: OptionDef<MasterLayout>[] = [
  { value: 'grid',   icon: LayoutGrid,     label: 'Grid' },
  { value: 'mosaic', icon: LayoutTemplate, label: 'Mosaic' },
  { value: 'list',   icon: List,           label: 'List' },
];

const SUB_OPTS: OptionDef<SubLayout>[] = [
  { value: 'list',  icon: Rows3,    label: 'List' },
  { value: 'cards', icon: Sparkles, label: 'Cards' },
  { value: 'chips', icon: Tag,      label: 'Chips' },
];

interface Props<T extends string> {
  value: T;
  options: OptionDef<T>[];
  onChange: (next: T) => void;
}

function Toggle<T extends string>({ value, options, onChange }: Props<T>) {
  return (
    <div
      role="radiogroup"
      aria-label="View layout"
      className="flex gap-0.5 bg-brand-light rounded-[10px] p-[3px]"
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={opt.label}
            onClick={() => onChange(opt.value)}
            className={[
              'w-7 h-7 rounded-[7px] flex items-center justify-center transition-all duration-150',
              active
                ? 'bg-white text-brand-dark shadow-[0_1px_3px_rgba(30,41,59,0.12)]'
                : 'bg-transparent text-slate-500 hover:text-brand-dark',
            ].join(' ')}
          >
            <Icon size={14} strokeWidth={1.9} />
          </button>
        );
      })}
    </div>
  );
}

export function MasterLayoutToggle(props: { value: MasterLayout; onChange: (v: MasterLayout) => void }) {
  return <Toggle<MasterLayout> value={props.value} options={MASTER_OPTS} onChange={props.onChange} />;
}

export function SubLayoutToggle(props: { value: SubLayout; onChange: (v: SubLayout) => void }) {
  return <Toggle<SubLayout> value={props.value} options={SUB_OPTS} onChange={props.onChange} />;
}
