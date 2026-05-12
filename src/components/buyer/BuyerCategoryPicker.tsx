import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CATEGORIES_DB, type Category } from '../../services/categories';
import MasterCategoryScreen from './MasterCategoryScreen';
import SubcategoryScreen from './SubcategoryScreen';
import { useLayoutPreference } from './useLayoutPreference';

interface Props {
  /** Called when the buyer picks a subcategory. Payload matches the
   *  existing CategorySelection contract: an array of category IDs that
   *  BuyerDashboard.handleInquiryComplete writes into
   *  pendingInquiry.categories. Single-select drill-down — picking a sub
   *  immediately advances the parent flow to the next step. */
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

  const pickSub = (sub: Category) => {
    onComplete([sub.id]);
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
            layout={layout}
            onLayoutChange={setLayout}
            onPickMaster={(m) => {
              setActiveMaster(m);
              setStage('sub');
            }}
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
            subLayout={subLayout}
            onSubLayoutChange={setSubLayout}
            onPickSub={pickSub}
            onBackToMasters={() => setStage('master')}
            isEntryPoint={isEntryPoint}
            onExit={onBack}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
