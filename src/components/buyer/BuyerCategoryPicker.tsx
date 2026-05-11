import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CATEGORIES_DB, type Category } from '../../services/categories';
import MasterCategoryScreen from './MasterCategoryScreen';
import SubcategoryScreen from './SubcategoryScreen';
import { useLayoutPreference } from './useLayoutPreference';

interface Props {
  /** Called when the buyer commits their selection.
   *  Payload matches the existing CategorySelection contract: an array
   *  of category IDs that BuyerDashboard.handleInquiryComplete writes
   *  into pendingInquiry.categories. */
  onComplete: (selectedCategoryIds: string[]) => void;
  onBack: () => void;
  /** Targeted-shop flow: skip the master grid, mount directly on the
   *  subcategory screen for this master and hide the back-to-master
   *  affordance. */
  preselectedParentId?: string;
}

export default function BuyerCategoryPicker({ onComplete, onBack, preselectedParentId }: Props) {
  const { layout, setLayout, subLayout, setSubLayout } = useLayoutPreference();

  const masters = useMemo(() => CATEGORIES_DB.filter((c) => c.parentId === null), []);
  const subsByMaster = useMemo(() => {
    const map: Record<string, Category[]> = {};
    for (const c of CATEGORIES_DB) {
      if (c.parentId) (map[c.parentId] ||= []).push(c);
    }
    return map;
  }, []);
  const subCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of masters) counts[m.id] = subsByMaster[m.id]?.length ?? 0;
    return counts;
  }, [masters, subsByMaster]);

  const isEntryPoint = Boolean(preselectedParentId);
  const initialMaster = preselectedParentId
    ? masters.find((m) => m.id === preselectedParentId) ?? null
    : null;

  // selections grouped by master id so we can show per-tile badges
  const [selections, setSelections] = useState<Record<string, Set<string>>>({});
  const [stage, setStage] = useState<'master' | 'sub'>(initialMaster ? 'sub' : 'master');
  const [activeMaster, setActiveMaster] = useState<Category | null>(initialMaster);

  useEffect(() => {
    if (!preselectedParentId) return;
    const m = masters.find((x) => x.id === preselectedParentId);
    if (m) {
      setActiveMaster(m);
      setStage('sub');
    }
  }, [preselectedParentId, masters]);

  const selectedCounts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [mid, set] of Object.entries(selections)) out[mid] = set.size;
    return out;
  }, [selections]);

  const totalSelected = useMemo(
    () => Object.values(selections).reduce((acc, s) => acc + s.size, 0),
    [selections],
  );

  const allSelectedIds = useMemo(() => {
    const out: string[] = [];
    for (const set of Object.values(selections)) for (const id of set) out.push(id);
    return out;
  }, [selections]);

  const toggleSub = (sub: Category) => {
    if (!sub.parentId) return;
    setSelections((prev) => {
      const next = { ...prev };
      const current = new Set(next[sub.parentId!] ?? []);
      if (current.has(sub.id)) current.delete(sub.id);
      else current.add(sub.id);
      if (current.size === 0) delete next[sub.parentId!];
      else next[sub.parentId!] = current;
      return next;
    });
  };

  const handleContinue = () => {
    if (allSelectedIds.length === 0) return;
    onComplete(allSelectedIds);
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {stage === 'master' && (
        <motion.div
          key="master"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        >
          <MasterCategoryScreen
            masters={masters}
            subCounts={subCounts}
            selectedCounts={selectedCounts}
            totalSelected={totalSelected}
            layout={layout}
            onLayoutChange={setLayout}
            onPickMaster={(m) => {
              setActiveMaster(m);
              setStage('sub');
            }}
            onContinue={handleContinue}
            onBack={onBack}
          />
        </motion.div>
      )}

      {stage === 'sub' && activeMaster && (
        <motion.div
          key={'sub-' + activeMaster.id}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 16 }}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        >
          <SubcategoryScreen
            master={activeMaster}
            subs={subsByMaster[activeMaster.id] ?? []}
            selected={selections[activeMaster.id] ?? new Set()}
            totalSelected={totalSelected}
            subLayout={subLayout}
            onSubLayoutChange={setSubLayout}
            onToggleSub={toggleSub}
            onBackToMasters={() => setStage('master')}
            onContinue={handleContinue}
            isEntryPoint={isEntryPoint}
            onExit={onBack}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
