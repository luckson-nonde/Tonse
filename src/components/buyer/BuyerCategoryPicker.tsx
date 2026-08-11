import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CATEGORIES_DB, type Category } from '../../services/categories';
import { useCategoryAvailability } from '../../services/categories/availability';
import { LABOUR_CATEGORIES } from '../../services/labourCategories';
import MasterCategoryScreen from './MasterCategoryScreen';
import SubcategoryScreen from './SubcategoryScreen';
import { useLayoutPreference } from './useLayoutPreference';

/**
 * Labour / machinery-hire selection payload — mirrors the shape
 * CategorySelection.handleLabourSubTypeSelect used to emit, which
 * BuyerDashboard.handleInquiryComplete already understands (its
 * `selectedCategories.isLabour` branch). Carrying `inquirySchemaKey`
 * is what routes the create-inquiry step to the per-trade (or
 * machinery-hire) form instead of a catalog schema.
 */
export interface LabourSelection {
  isLabour: true;
  labourGroup: string;
  category: string;
  categoryId: string;
  inquirySchemaKey: string;
}

// Synthetic masters injected next to the CATEGORIES_DB roots: buyers hire
// PEOPLE (labour trades) and EQUIPMENT (machinery) through the same picker
// they buy goods/services in. Ids match the backend `categories` rows
// (seeded from labourCategories.ts), so admin category-control applies.
const SYNTHETIC_MASTERS: Category[] = [
  { id: 'labour', name: 'Labour & Skills', parentId: null } as Category,
  { id: 'machinery-hire', name: 'Heavy Machinery for Hire', parentId: null } as Category,
];

interface Props {
  /** Called when the buyer picks a subcategory. Catalog picks emit an
   *  array of category IDs (the existing CategorySelection contract);
   *  labour/machinery picks emit a LabourSelection object. Both shapes
   *  land in BuyerDashboard.handleInquiryComplete unchanged. */
  onComplete: (selection: string[] | LabourSelection) => void;
  onBack: () => void;
  /** Targeted-shop flow: skip the master grid, mount directly on the
   *  subcategory screen for this master and hide the back-to-master
   *  affordance. */
  preselectedParentId?: string;
}

export default function BuyerCategoryPicker({ onComplete, onBack, preselectedParentId }: Props) {
  const { layout, setLayout, subLayout, setSubLayout } = useLayoutPreference();
  const { isAvailable, disabledIds } = useCategoryAvailability();

  // Admin category control: hide any master/subcategory switched off (a sub
  // whose parent is off is also effectively unavailable).
  const masters = useMemo(
    () => [
      ...CATEGORIES_DB.filter((c) => c.parentId === null && isAvailable(c.id)),
      ...SYNTHETIC_MASTERS.filter((m) => isAvailable(m.id)),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [disabledIds],
  );
  const subsByMaster = useMemo(() => {
    const map: Record<string, Category[]> = {};
    for (const c of CATEGORIES_DB) {
      if (c.parentId && isAvailable(c.id)) (map[c.parentId] ||= []).push(c);
    }
    // Labour trades + machinery equipment as Category-shaped subs of the
    // synthetic masters. Trades keep their taxonomy order; each id also
    // exists in the backend categories table, so availability applies.
    for (const entry of LABOUR_CATEGORIES) {
      // "All Jobs" is a jobseeker's no-trade signup pick, not something a buyer
      // can request or tag a vacancy with — a posting needs a real trade.
      if (entry.category === 'ANY_WORK') continue;
      const masterId = entry.category === 'MACHINERY_HIRE' ? 'machinery-hire' : 'labour';
      if (!isAvailable(entry.id)) continue;
      (map[masterId] ||= []).push({
        id: entry.id,
        name: entry.label,
        parentId: masterId,
      } as Category);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabledIds]);
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
    // Labour / machinery picks carry their full context (group, schema
    // key) so the create-inquiry step renders the right form — the
    // per-trade labour schema or the machinery-hire schema.
    if (sub.parentId === 'labour' || sub.parentId === 'machinery-hire') {
      const entry = LABOUR_CATEGORIES.find((c) => c.id === sub.id);
      if (entry) {
        onComplete({
          isLabour: true,
          labourGroup: entry.category,
          category: entry.label,
          categoryId: entry.id,
          inquirySchemaKey: entry.inquirySchemaKey,
        });
        return;
      }
    }
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
