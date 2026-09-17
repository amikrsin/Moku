import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Check, Sparkles, Copy, 
  ChevronUp, ChevronDown, Plus, Trash2, RotateCcw,
  CheckCircle2, ArrowRight, ArrowLeft
} from 'lucide-react';
import { 
  Plan, 
  CATEGORIES, 
  Category, 
  PlannedSector, 
  DEFAULT_CATEGORY_SECTORS,
  CategoryBudgets,
  BudgetLine
} from '../types';
import { formatCurrency, formatMonthName, generateUUID, getCurrencySymbol } from '../lib/storage';
import { HankoStamp } from './HankoStamp';

interface MonthlyPlanSheetProps {
  isOpen: boolean;
  onClose: () => void;
  monthKey: string;
  existingPlan: Plan | null;
  allPlans?: Plan[];
  onSavePlan: (plan: Plan) => void;
  currency: string;
}

// 4 Pillars of Kakeibo
const CATEGORY_KEYS: Category[] = ['survival', 'optional', 'culture', 'extra'];

const INTENTION_SUGGESTIONS = [
  'Cook wholesome meals at home and avoid impulse online shopping.',
  'Audit and cancel unused digital subscriptions.',
  'Wait 48 hours before purchasing non-essential wants.',
  'Prepare packed lunch for office days.',
  'Limit ride-hailing app usage to emergency situations.',
  'Borrow books from library instead of buying new.',
];

export function MonthlyPlanSheet({
  isOpen,
  onClose,
  monthKey,
  existingPlan,
  allPlans = [],
  onSavePlan,
  currency,
}: MonthlyPlanSheetProps) {
  // Resolved currency symbol for display (e.g. ₹ for INR)
  const currencySymbol = useMemo(() => getCurrencySymbol(currency), [currency]);

  // 3-step streamlined workflow:
  // Step 0: Available Money & Savings Commitment
  // Step 1: Category Allocation (4 Pillars + Sub-sections)
  // Step 2: Review & Intentions
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  // Step 1 Inputs: Income, Opening Balance, Savings Target
  const [incomeStr, setIncomeStr] = useState<string>('50000');
  const [openingBalanceStr, setOpeningBalanceStr] = useState<string>('0');
  const [savingsTargetStr, setSavingsTargetStr] = useState<string>('15000');
  const [selectedSavingsRate, setSelectedSavingsRate] = useState<number | null>(30);

  // Step 2 Inputs: Category Totals & Sub-sections
  const [activePreset, setActivePreset] = useState<'balanced' | 'essential' | 'lifestyle' | null>('balanced');
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudgets>({
    survival: 18000,
    optional: 7100,
    culture: 5000,
    extra: 5100,
  });

  const [sectorsByCategory, setSectorsByCategory] = useState<Record<Category, PlannedSector[]>>({
    survival: [],
    optional: [],
    culture: [],
    extra: [],
  });

  // Expanded state for category sub-sections in Step 2
  const [expandedCategories, setExpandedCategories] = useState<Record<Category, boolean>>({
    survival: true,
    optional: false,
    culture: false,
    extra: false,
  });

  // Inline new sub-section input draft per category
  const [newSectorDraft, setNewSectorDraft] = useState<Record<Category, { name: string; amount: string }>>({
    survival: { name: '', amount: '' },
    optional: { name: '', amount: '' },
    culture: { name: '', amount: '' },
    extra: { name: '', amount: '' },
  });

  // Step 3 Inputs: Mindful Habit
  const [improvementNote, setImprovementNote] = useState<string>(
    'Cook wholesome meals at home and avoid impulse online shopping.'
  );

  // Seal animation trigger
  const [isSealed, setIsSealed] = useState<boolean>(false);

  // Copy past plan state
  const [copyNotification, setCopyNotification] = useState<string | null>(null);
  const [snapshotBeforeCopy, setSnapshotBeforeCopy] = useState<{
    incomeStr: string;
    openingBalanceStr: string;
    savingsTargetStr: string;
    categoryBudgets: CategoryBudgets;
    sectorsByCategory: Record<Category, PlannedSector[]>;
    improvementNote: string;
  } | null>(null);

  // Past plans available to copy
  const pastPlans = useMemo(() => {
    return (allPlans || [])
      .filter((p) => p.monthKey !== monthKey && (p.income || 0) > 0)
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [allPlans, monthKey]);

  const latestPastPlan = pastPlans[0] || null;

  // Helper to generate default sectors from category total
  const initDefaultSectors = (cat: Category, totalAmount: number): PlannedSector[] => {
    const template = DEFAULT_CATEGORY_SECTORS[cat] || [];
    return template.map((item, idx) => ({
      id: `sector-${cat}-${idx + 1}-${Date.now()}`,
      name: item.name,
      icon: item.icon,
      plannedAmount: totalAmount > 0 ? Math.round((totalAmount * item.defaultShare) / 100) * 100 : 0,
    }));
  };

  // Sync state whenever sheet opens or existingPlan changes
  useEffect(() => {
    if (!isOpen) {
      setIsSealed(false);
      return;
    }

    setCurrentStepIndex(0);
    setIsSealed(false);
    setCopyNotification(null);
    setSnapshotBeforeCopy(null);

    if (existingPlan) {
      setIncomeStr(existingPlan.income ? String(existingPlan.income) : '50000');
      setOpeningBalanceStr(existingPlan.openingBalance ? String(existingPlan.openingBalance) : '0');
      setSavingsTargetStr(existingPlan.savingsTarget ? String(existingPlan.savingsTarget) : '15000');
      setImprovementNote(existingPlan.improvementNotes || 'Cook wholesome meals at home and avoid impulse online shopping.');

      if (existingPlan.categoryBudgets) {
        setCategoryBudgets({
          survival: existingPlan.categoryBudgets.survival || 0,
          optional: existingPlan.categoryBudgets.optional || 0,
          culture: existingPlan.categoryBudgets.culture || 0,
          extra: existingPlan.categoryBudgets.extra || 0,
        });
      }

      if (existingPlan.plannedSectors) {
        setSectorsByCategory({
          survival: existingPlan.plannedSectors.survival || [],
          optional: existingPlan.plannedSectors.optional || [],
          culture: existingPlan.plannedSectors.culture || [],
          extra: existingPlan.plannedSectors.extra || [],
        });
      } else {
        setSectorsByCategory({
          survival: initDefaultSectors('survival', existingPlan.categoryBudgets?.survival || 18000),
          optional: initDefaultSectors('optional', existingPlan.categoryBudgets?.optional || 7100),
          culture: initDefaultSectors('culture', existingPlan.categoryBudgets?.culture || 5000),
          extra: initDefaultSectors('extra', existingPlan.categoryBudgets?.extra || 5100),
        });
      }
    } else if (latestPastPlan) {
      // Pre-fill previous month baseline
      setIncomeStr(String(latestPastPlan.income || 50000));
      setOpeningBalanceStr(String(latestPastPlan.openingBalance || 0));
      setSavingsTargetStr(String(latestPastPlan.savingsTarget || 15000));
      setImprovementNote(latestPastPlan.improvementNotes || 'Cook wholesome meals at home and avoid impulse online shopping.');

      if (latestPastPlan.categoryBudgets) {
        setCategoryBudgets({
          survival: latestPastPlan.categoryBudgets.survival || 18000,
          optional: latestPastPlan.categoryBudgets.optional || 7100,
          culture: latestPastPlan.categoryBudgets.culture || 5000,
          extra: latestPastPlan.categoryBudgets.extra || 5100,
        });
      }

      if (latestPastPlan.plannedSectors) {
        setSectorsByCategory({
          survival: latestPastPlan.plannedSectors.survival || [],
          optional: latestPastPlan.plannedSectors.optional || [],
          culture: latestPastPlan.plannedSectors.culture || [],
          extra: latestPastPlan.plannedSectors.extra || [],
        });
      } else {
        setSectorsByCategory({
          survival: initDefaultSectors('survival', latestPastPlan.categoryBudgets?.survival || 18000),
          optional: initDefaultSectors('optional', latestPastPlan.categoryBudgets?.optional || 7100),
          culture: initDefaultSectors('culture', latestPastPlan.categoryBudgets?.culture || 5000),
          extra: initDefaultSectors('extra', latestPastPlan.categoryBudgets?.extra || 5100),
        });
      }
    } else {
      // Default starting setup matching the user's screenshots
      setIncomeStr('50000');
      setOpeningBalanceStr('0');
      setSavingsTargetStr('15000');
      setSelectedSavingsRate(30);
      setImprovementNote('Cook wholesome meals at home and avoid impulse online shopping.');
      setCategoryBudgets({
        survival: 18000,
        optional: 7100,
        culture: 5000,
        extra: 5100,
      });
      setSectorsByCategory({
        survival: initDefaultSectors('survival', 18000),
        optional: initDefaultSectors('optional', 7100),
        culture: initDefaultSectors('culture', 5000),
        extra: initDefaultSectors('extra', 5100),
      });
    }
  }, [isOpen, existingPlan, latestPastPlan]);

  if (!isOpen) return null;

  // Numeric calculations
  const parsedIncome = Math.max(0, parseFloat(incomeStr) || 0);
  const parsedOpeningBalance = parseFloat(openingBalanceStr) || 0;
  const totalAvailable = Math.max(0, parsedIncome + parsedOpeningBalance);

  const parsedSavingsTarget = Math.max(0, parseFloat(savingsTargetStr) || 0);
  const spendablePool = Math.max(0, totalAvailable - parsedSavingsTarget);

  const totalPlannedExpenses =
    (categoryBudgets.survival || 0) +
    (categoryBudgets.optional || 0) +
    (categoryBudgets.culture || 0) +
    (categoryBudgets.extra || 0);

  const budgetDifference = totalPlannedExpenses - spendablePool;

  // Percentage calculations
  const savingsRate = totalAvailable > 0 ? Math.round((parsedSavingsTarget / totalAvailable) * 100) : 0;

  // Quick Savings Percentage Handler
  const handleApplySavingsRate = (ratePercent: number) => {
    setSelectedSavingsRate(ratePercent);
    const amount = Math.round((totalAvailable * ratePercent) / 100);
    setSavingsTargetStr(String(amount));
  };

  // Quick Category Presets (Balanced, Essential-Heavy, Lifestyle)
  const handleApplyPreset = (preset: 'balanced' | 'essential' | 'lifestyle') => {
    setActivePreset(preset);
    let ratios = { survival: 0.55, optional: 0.22, culture: 0.11, extra: 0.12 };

    if (preset === 'essential') {
      ratios = { survival: 0.65, optional: 0.15, culture: 0.10, extra: 0.10 };
    } else if (preset === 'lifestyle') {
      ratios = { survival: 0.45, optional: 0.30, culture: 0.15, extra: 0.10 };
    }

    const surv = Math.round(spendablePool * ratios.survival);
    const opt = Math.round(spendablePool * ratios.optional);
    const cult = Math.round(spendablePool * ratios.culture);
    const extr = Math.max(0, spendablePool - (surv + opt + cult));

    setCategoryBudgets({
      survival: surv,
      optional: opt,
      culture: cult,
      extra: extr,
    });

    setSectorsByCategory({
      survival: initDefaultSectors('survival', surv),
      optional: initDefaultSectors('optional', opt),
      culture: initDefaultSectors('culture', cult),
      extra: initDefaultSectors('extra', extr),
    });
  };

  // Toggle category accordion in Step 2
  const toggleCategoryExpand = (cat: Category) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [cat]: !prev[cat],
    }));
  };

  // Category Total Input Change
  const handleCategoryTotalChange = (cat: Category, valStr: string) => {
    const num = Math.max(0, parseFloat(valStr) || 0);
    setCategoryBudgets((prev) => ({ ...prev, [cat]: num }));
    setActivePreset(null);
  };

  // Sector planned amount edit
  const handleUpdateSectorAmount = (cat: Category, sectorId: string, amountStr: string) => {
    const amt = Math.max(0, parseFloat(amountStr) || 0);
    setSectorsByCategory((prev) => {
      const list = prev[cat] || [];
      const updated = list.map((s) => (s.id === sectorId ? { ...s, plannedAmount: amt } : s));
      return { ...prev, [cat]: updated };
    });
  };

  // Delete a sub-section
  const handleDeleteSector = (cat: Category, sectorId: string) => {
    setSectorsByCategory((prev) => ({
      ...prev,
      [cat]: (prev[cat] || []).filter((s) => s.id !== sectorId),
    }));
  };

  // Add custom sub-section inline
  const handleAddCustomSector = (cat: Category) => {
    const draft = newSectorDraft[cat];
    if (!draft || !draft.name.trim()) return;

    const amt = Math.max(0, parseFloat(draft.amount) || 0);
    const newSector: PlannedSector = {
      id: `sector-${cat}-${Date.now()}`,
      name: draft.name.trim(),
      icon: CATEGORIES[cat].icon,
      plannedAmount: amt,
    };

    setSectorsByCategory((prev) => ({
      ...prev,
      [cat]: [...(prev[cat] || []), newSector],
    }));

    // Reset draft input
    setNewSectorDraft((prev) => ({
      ...prev,
      [cat]: { name: '', amount: '' },
    }));
  };

  // Copy past plan handler
  const handleCopyPastPlan = (sourcePlan: Plan) => {
    setSnapshotBeforeCopy({
      incomeStr,
      openingBalanceStr,
      savingsTargetStr,
      categoryBudgets: { ...categoryBudgets },
      sectorsByCategory: { ...sectorsByCategory },
      improvementNote,
    });

    setIncomeStr(String(sourcePlan.income || 0));
    setOpeningBalanceStr(String(sourcePlan.openingBalance || 0));
    setSavingsTargetStr(String(sourcePlan.savingsTarget || 0));
    setImprovementNote(sourcePlan.improvementNotes || '');

    if (sourcePlan.categoryBudgets) {
      setCategoryBudgets({ ...sourcePlan.categoryBudgets });
    }

    if (sourcePlan.plannedSectors) {
      setSectorsByCategory({
        survival: (sourcePlan.plannedSectors.survival || []).map((s) => ({ ...s, id: generateUUID() })),
        optional: (sourcePlan.plannedSectors.optional || []).map((s) => ({ ...s, id: generateUUID() })),
        culture: (sourcePlan.plannedSectors.culture || []).map((s) => ({ ...s, id: generateUUID() })),
        extra: (sourcePlan.plannedSectors.extra || []).map((s) => ({ ...s, id: generateUUID() })),
      });
    }

    setCopyNotification(
      `Budget plan copied from ${formatMonthName(sourcePlan.monthKey)}.`
    );
  };

  const handleUndoCopy = () => {
    if (snapshotBeforeCopy) {
      setIncomeStr(snapshotBeforeCopy.incomeStr);
      setOpeningBalanceStr(snapshotBeforeCopy.openingBalanceStr);
      setSavingsTargetStr(snapshotBeforeCopy.savingsTargetStr);
      setCategoryBudgets(snapshotBeforeCopy.categoryBudgets);
      setSectorsByCategory(snapshotBeforeCopy.sectorsByCategory);
      setImprovementNote(snapshotBeforeCopy.improvementNote);
      setSnapshotBeforeCopy(null);
      setCopyNotification(null);
    }
  };

  // Save Plan
  const handleSave = () => {
    setIsSealed(true);
    setTimeout(() => {
      // Also derive categoryBudgetLines for full backwards compatibility
      const categoryBudgetLines: {
        survival: BudgetLine[];
        optional: BudgetLine[];
        culture: BudgetLine[];
        extra: BudgetLine[];
      } = {
        survival: (sectorsByCategory.survival || []).map((s) => ({ id: s.id, name: s.name, budget: s.plannedAmount })),
        optional: (sectorsByCategory.optional || []).map((s) => ({ id: s.id, name: s.name, budget: s.plannedAmount })),
        culture: (sectorsByCategory.culture || []).map((s) => ({ id: s.id, name: s.name, budget: s.plannedAmount })),
        extra: (sectorsByCategory.extra || []).map((s) => ({ id: s.id, name: s.name, budget: s.plannedAmount })),
      };

      const planToSave: Plan = {
        monthKey,
        income: parsedIncome,
        openingBalance: parsedOpeningBalance !== 0 ? parsedOpeningBalance : undefined,
        savingsTarget: parsedSavingsTarget,
        totalExpenses: totalPlannedExpenses,
        improvementNotes: improvementNote.trim() || 'Cook wholesome meals at home and avoid impulse online shopping.',
        categoryBudgets: { ...categoryBudgets },
        plannedSectors: sectorsByCategory,
        categoryBudgetLines,
        currency,
        reflection: existingPlan?.reflection || '',
        updatedAt: Date.now(),
      };

      onSavePlan(planToSave);
      onClose();
    }, 450);
  };

  const monthTitle = formatMonthName(monthKey);
  const totalSteps = 3;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/55 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[92vh] flex flex-col bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-gray-200/80 dark:border-zinc-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Drag Handle Indicator */}
        <div className="w-12 h-1 bg-gray-300 dark:bg-zinc-600 rounded-full mx-auto mt-3 shrink-0" />

        {/* Header Bar */}
        <div className="px-5 pt-2 pb-3 border-b border-gray-100 dark:border-zinc-800/80 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#165B40] dark:text-emerald-400">
                {monthTitle} · STEP {currentStepIndex + 1} OF {totalSteps}
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Bar Line */}
          <div className="w-full bg-gray-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-2.5">
            <div
              className="bg-[#165B40] dark:bg-emerald-500 h-full transition-all duration-300"
              style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* =========================================================================
              STEP 1: AVAILABLE MONEY & SAVINGS COMMITMENT
             ========================================================================= */}
          {currentStepIndex === 0 && (
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              {/* Step Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                    1. Available Money
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                    Determine your total inflows and pay-yourself-first savings.
                  </p>
                </div>

                {/* Optional Copy Past Month Action */}
                {latestPastPlan && (
                  <button
                    type="button"
                    onClick={() => handleCopyPastPlan(latestPastPlan)}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-xs font-semibold text-gray-700 dark:text-zinc-300 transition-colors cursor-pointer shrink-0"
                    title={`Copy numbers from ${formatMonthName(latestPastPlan.monthKey)}`}
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy {formatMonthName(latestPastPlan.monthKey)}</span>
                  </button>
                )}
              </div>

              {/* Copy Notification with Undo */}
              {copyNotification && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>{copyNotification}</span>
                  </div>
                  {snapshotBeforeCopy && (
                    <button
                      type="button"
                      onClick={handleUndoCopy}
                      className="flex items-center space-x-1 px-2 py-0.5 rounded bg-white dark:bg-emerald-900 border border-emerald-300 text-xs font-bold text-emerald-700 dark:text-emerald-200 hover:bg-emerald-50 cursor-pointer shrink-0"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Undo</span>
                    </button>
                  )}
                </div>
              )}

              {/* Expected Monthly Income Field */}
              <div className="space-y-1.5">
                <label
                  htmlFor="input-expected-income"
                  className="text-[11px] font-bold text-gray-600 dark:text-zinc-400 uppercase tracking-wider block"
                >
                  EXPECTED MONTHLY INCOME
                </label>
                <div className="flex items-center h-13 px-4 rounded-xl bg-[#f4f6f4] dark:bg-zinc-800/80 border border-gray-200/80 dark:border-zinc-700 focus-within:border-[#165B40] focus-within:ring-1 focus-within:ring-[#165B40] transition-all">
                  <span className="text-lg font-bold text-gray-600 dark:text-zinc-300 mr-2 select-none">
                    {currencySymbol}
                  </span>
                  <input
                    id="input-expected-income"
                    type="number"
                    step="any"
                    value={incomeStr}
                    onChange={(e) => setIncomeStr(e.target.value)}
                    placeholder="50000"
                    className="w-full bg-transparent text-xl font-bold font-tabular text-gray-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              {/* Opening Balance / Carryover Field */}
              <div className="space-y-1.5">
                <label
                  htmlFor="input-opening-carryover"
                  className="text-[11px] font-bold text-gray-600 dark:text-zinc-400 uppercase tracking-wider block"
                >
                  OPENING BALANCE / CARRYOVER
                </label>
                <div className="flex items-center h-13 px-4 rounded-xl bg-[#f4f6f4] dark:bg-zinc-800/80 border border-gray-200/80 dark:border-zinc-700 focus-within:border-[#165B40] focus-within:ring-1 focus-within:ring-[#165B40] transition-all">
                  <span className="text-lg font-bold text-gray-600 dark:text-zinc-300 mr-2 select-none">
                    {currencySymbol}
                  </span>
                  <input
                    id="input-opening-carryover"
                    type="number"
                    step="any"
                    value={openingBalanceStr}
                    onChange={(e) => setOpeningBalanceStr(e.target.value)}
                    placeholder="0"
                    className="w-full bg-transparent text-xl font-bold font-tabular text-gray-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              {/* Target Monthly Savings Field */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="input-target-savings"
                    className="text-[11px] font-bold text-gray-600 dark:text-zinc-400 uppercase tracking-wider block"
                  >
                    TARGET MONTHLY SAVINGS
                  </label>
                  {savingsRate > 0 && (
                    <span className="text-xs font-semibold text-[#165B40] dark:text-emerald-400">
                      {savingsRate}% of available
                    </span>
                  )}
                </div>

                <div className="flex items-center h-13 px-4 rounded-xl bg-[#f4f6f4] dark:bg-zinc-800/80 border border-gray-200/80 dark:border-zinc-700 focus-within:border-[#165B40] focus-within:ring-1 focus-within:ring-[#165B40] transition-all">
                  <span className="text-lg font-bold text-gray-600 dark:text-zinc-300 mr-2 select-none">
                    {currencySymbol}
                  </span>
                  <input
                    id="input-target-savings"
                    type="number"
                    step="any"
                    value={savingsTargetStr}
                    onChange={(e) => {
                      setSavingsTargetStr(e.target.value);
                      setSelectedSavingsRate(null);
                    }}
                    placeholder="15000"
                    className="w-full bg-transparent text-xl font-bold font-tabular text-gray-900 dark:text-white outline-none"
                  />
                </div>

                {/* Savings Target Quick Percentage Chips */}
                <div className="grid grid-cols-4 gap-2 pt-1">
                  {[15, 20, 25, 30].map((pct) => {
                    const isSelected = selectedSavingsRate === pct;
                    return (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => handleApplySavingsRate(pct)}
                        className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#165B40] text-white shadow-xs'
                            : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700'
                        }`}
                      >
                        {pct}%
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Total Available & Spendable Pool Summary Card (Screenshot 5) */}
              <div className="p-4 rounded-2xl bg-[#eaf4ef] dark:bg-emerald-950/20 border border-[#d2e5da] dark:border-emerald-800/30 space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-700 dark:text-zinc-300">
                  <span>Total Available Money</span>
                  <span className="font-bold font-tabular text-gray-900 dark:text-white">
                    {formatCurrency(totalAvailable, currency)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
                  <span>Committed Savings Target</span>
                  <span className="font-bold font-tabular">
                    -{formatCurrency(parsedSavingsTarget, currency)}
                  </span>
                </div>

                <div className="border-t border-[#c6dfd0] dark:border-emerald-800/40 my-1 pt-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    Available to Spend
                  </span>
                  <span className="text-xl font-extrabold text-[#165B40] dark:text-emerald-400 font-tabular">
                    {formatCurrency(spendablePool, currency)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              STEP 2: CATEGORY ALLOCATION (4 PILLARS & SUB-SECTIONS)
             ========================================================================= */}
          {currentStepIndex === 1 && (
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              {/* Step Header */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                  2. Category Allocation
                </h2>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                  Distribute your spendable budget across the 4 Kakeibo pillars.
                </p>
              </div>

              {/* Pool Status Card (Screenshot 6 & 7) */}
              <div className="p-3.5 rounded-2xl bg-[#f4f6f4] dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700/60 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-zinc-400">
                  <span>Available Spendable Pool:</span>
                  <span className="font-bold font-tabular text-gray-900 dark:text-white">
                    {formatCurrency(spendablePool, currency)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-zinc-400">
                  <span>Identified Sector Allocation:</span>
                  <span className="font-bold font-tabular text-gray-900 dark:text-white">
                    {formatCurrency(totalPlannedExpenses, currency)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-200/80 dark:border-zinc-700/80">
                  <span className="text-gray-600 dark:text-zinc-400 font-medium">Status:</span>
                  {budgetDifference === 0 ? (
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                      On Track (Fully Allocated)
                    </span>
                  ) : budgetDifference > 0 ? (
                    <span className="font-bold text-rose-600 dark:text-rose-400 font-tabular">
                      {formatCurrency(budgetDifference, currency)} Over Budget
                    </span>
                  ) : (
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 font-tabular">
                      {formatCurrency(Math.abs(budgetDifference), currency)} Remaining
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Category Presets (Screenshots 1, 2, 6) */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block">
                  QUICK CATEGORY PRESETS
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('balanced')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
                      activePreset === 'balanced'
                        ? 'bg-white dark:bg-zinc-800 border-2 border-[#165B40] text-[#165B40] dark:text-emerald-400 shadow-xs'
                        : 'bg-[#f4f6f4] dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:bg-gray-100'
                    }`}
                  >
                    <div>Balanced</div>
                    <div className="text-[10px] font-normal text-gray-500 dark:text-zinc-400 font-tabular">
                      (55/22/11/12)
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyPreset('essential')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
                      activePreset === 'essential'
                        ? 'bg-white dark:bg-zinc-800 border-2 border-[#165B40] text-[#165B40] dark:text-emerald-400 shadow-xs'
                        : 'bg-[#f4f6f4] dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:bg-gray-100'
                    }`}
                  >
                    <div>Essential-Heavy</div>
                    <div className="text-[10px] font-normal text-gray-500 dark:text-zinc-400 font-tabular">
                      (65/15/10/10)
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyPreset('lifestyle')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
                      activePreset === 'lifestyle'
                        ? 'bg-white dark:bg-zinc-800 border-2 border-[#165B40] text-[#165B40] dark:text-emerald-400 shadow-xs'
                        : 'bg-[#f4f6f4] dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:bg-gray-100'
                    }`}
                  >
                    <div>Lifestyle</div>
                    <div className="text-[10px] font-normal text-gray-500 dark:text-zinc-400 font-tabular">
                      (45/30/15/10)
                    </div>
                  </button>
                </div>
              </div>

              {/* 4 Category Cards (Screenshots 1, 2, 6, 7) */}
              <div className="space-y-3">
                {CATEGORY_KEYS.map((catKey) => {
                  const cat = CATEGORIES[catKey];
                  const catBudget = categoryBudgets[catKey] || 0;
                  const sectors = sectorsByCategory[catKey] || [];
                  const sectorsSum = sectors.reduce((acc, s) => acc + (s.plannedAmount || 0), 0);
                  const isExpanded = Boolean(expandedCategories[catKey]);
                  const pct = spendablePool > 0 ? Math.round((catBudget / spendablePool) * 100) : 0;

                  return (
                    <div
                      key={catKey}
                      className="rounded-2xl bg-[#f4f6f4] dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700/60 p-4 space-y-3 transition-all"
                    >
                      {/* Top Header Row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-xl select-none">{cat.icon}</span>
                          <span className="text-sm font-extrabold text-gray-900 dark:text-white">
                            {cat.name}
                          </span>
                          <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-white dark:bg-zinc-700 border border-gray-200 dark:border-zinc-600 text-gray-600 dark:text-zinc-300">
                            {sectors.length} sectors
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-gray-700 dark:text-zinc-300 font-tabular">
                            {pct}%
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleCategoryExpand(catKey)}
                            className="p-1 rounded-lg text-gray-500 hover:text-gray-800 dark:hover:text-zinc-200 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                            aria-label={`Toggle ${cat.name} sub-sections`}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Sub-description */}
                      <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                        {cat.description}
                      </p>

                      {/* Main Category Budget Input (Screenshots 1 & 2) */}
                      <div className="flex items-center h-12 px-3.5 rounded-xl bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus-within:border-[#165B40] focus-within:ring-1 focus-within:ring-[#165B40] transition-all">
                        <span className="text-sm font-bold text-gray-500 dark:text-zinc-400 mr-2 select-none">
                          {currencySymbol}
                        </span>
                        <input
                          type="number"
                          step="any"
                          value={catBudget || ''}
                          onChange={(e) => handleCategoryTotalChange(catKey, e.target.value)}
                          placeholder="0"
                          className="w-full bg-transparent text-base font-bold font-tabular text-gray-900 dark:text-white outline-none"
                        />
                      </div>

                      {/* Expandable Sub-sections & Budgets Manager (Screenshots 6 & 7) */}
                      {isExpanded && (
                        <div className="pt-2 border-t border-gray-200/80 dark:border-zinc-700/80 space-y-2.5">
                          <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                            <span>SUB-SECTIONS &amp; BUDGETS</span>
                            <span className="font-tabular">
                              SUM: {formatCurrency(sectorsSum, currency)}
                            </span>
                          </div>

                          {/* Existing Sectors List */}
                          <div className="space-y-1.5">
                            {sectors.map((sector) => (
                              <div
                                key={sector.id}
                                className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-zinc-800 border border-gray-200/70 dark:border-zinc-700/70 text-xs"
                              >
                                <span className="font-semibold text-gray-800 dark:text-zinc-200 pl-1 truncate">
                                  {sector.name}
                                </span>

                                <div className="flex items-center space-x-1.5 shrink-0">
                                  <span className="text-[11px] font-bold text-gray-400 select-none">
                                    {currencySymbol}
                                  </span>
                                  <input
                                    type="number"
                                    step="any"
                                    value={sector.plannedAmount || ''}
                                    onChange={(e) =>
                                      handleUpdateSectorAmount(catKey, sector.id, e.target.value)
                                    }
                                    placeholder="0"
                                    className="w-20 h-7 px-2 rounded-lg bg-[#f4f6f4] dark:bg-zinc-700 text-right text-xs font-bold font-tabular text-gray-900 dark:text-white border border-gray-200 dark:border-zinc-600 outline-none focus:border-[#165B40]"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSector(catKey, sector.id)}
                                    className="p-1 text-gray-400 hover:text-rose-500 rounded transition-colors cursor-pointer"
                                    title="Delete sub-section"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Inline Add Sub-section Row (Screenshot 6 & 7) */}
                          <div className="flex items-center space-x-2 pt-1">
                            <input
                              type="text"
                              value={newSectorDraft[catKey]?.name || ''}
                              onChange={(e) =>
                                setNewSectorDraft((prev) => ({
                                  ...prev,
                                  [catKey]: { ...(prev[catKey] || { amount: '' }), name: e.target.value },
                                }))
                              }
                              placeholder="Add sub-section (e.g. Rent, Groceries)"
                              className="flex-1 h-9 px-3 rounded-xl bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-xs text-gray-900 dark:text-white outline-none focus:border-[#165B40]"
                            />
                            <div className="relative flex items-center w-24 shrink-0">
                              <span className="absolute left-2.5 text-xs font-bold text-gray-400 select-none">
                                {currencySymbol}
                              </span>
                              <input
                                type="number"
                                step="any"
                                value={newSectorDraft[catKey]?.amount || ''}
                                onChange={(e) =>
                                  setNewSectorDraft((prev) => ({
                                    ...prev,
                                    [catKey]: { ...(prev[catKey] || { name: '' }), amount: e.target.value },
                                  }))
                                }
                                placeholder="0"
                                className="w-full h-9 pl-6 pr-2 rounded-xl bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-xs font-bold font-tabular text-gray-900 dark:text-white outline-none focus:border-[#165B40]"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAddCustomSector(catKey)}
                              className="h-9 px-3 rounded-xl bg-[#165B40] hover:bg-[#124d35] text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
                            >
                              + Add
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* =========================================================================
              STEP 3: REVIEW & INTENTIONS (MINDFUL BLUEPRINT)
             ========================================================================= */}
          {currentStepIndex === 2 && (
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              {/* Step Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                    3. Review &amp; Intentions
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                    Set a mindful habit and confirm your monthly blueprint.
                  </p>
                </div>
                {isSealed && (
                  <div className="shrink-0">
                    <HankoStamp text="SEALED" size="sm" />
                  </div>
                )}
              </div>

              {/* Inflows & Allocations Summary Card (Screenshot 9) */}
              <div className="p-4 rounded-2xl bg-[#f4f6f4] dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700/60 space-y-2.5">
                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-zinc-400">
                  <span>Total Available Inflows</span>
                  <span className="font-bold font-tabular text-gray-900 dark:text-white">
                    {formatCurrency(totalAvailable, currency)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
                  <span>Committed Savings</span>
                  <span className="font-bold font-tabular">
                    {formatCurrency(parsedSavingsTarget, currency)}
                  </span>
                </div>

                <div className="border-t border-gray-200/80 dark:border-zinc-700/80 pt-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900 dark:text-white">
                    Identified Monthly Spending Allocation
                  </span>
                  <span className="text-base font-extrabold text-[#165B40] dark:text-emerald-400 font-tabular">
                    {formatCurrency(totalPlannedExpenses, currency)}
                  </span>
                </div>
              </div>

              {/* 4 Pillars Breakdown with Sector Pill Tags (Screenshot 9) */}
              <div className="space-y-2.5">
                {CATEGORY_KEYS.map((catKey) => {
                  const cat = CATEGORIES[catKey];
                  const catBudget = categoryBudgets[catKey] || 0;
                  const sectors = (sectorsByCategory[catKey] || []).filter(
                    (s) => (s.plannedAmount || 0) > 0
                  );

                  return (
                    <div
                      key={catKey}
                      className="p-3.5 rounded-2xl bg-[#f4f6f4] dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700/60 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-base select-none">{cat.icon}</span>
                          <span className="text-xs font-bold text-gray-900 dark:text-white">
                            {cat.name} ({sectors.length} sectors)
                          </span>
                        </div>
                        <span className="text-xs font-extrabold text-gray-900 dark:text-white font-tabular">
                          {formatCurrency(catBudget, currency)}
                        </span>
                      </div>

                      {/* Sector Tags Wrap */}
                      {sectors.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {sectors.map((s) => (
                            <span
                              key={s.id}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-700/80 border border-gray-200/80 dark:border-zinc-600/80 text-[11px] text-gray-700 dark:text-zinc-200"
                            >
                              <span className="text-xs">{s.icon || '🏷️'}</span>
                              <span className="font-medium">{s.name}:</span>
                              <span className="font-bold font-tabular">
                                {formatCurrency(s.plannedAmount, currency)}
                              </span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-gray-400 italic">No specific sub-sectors planned</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Mindful Habit Section (Screenshot 9) */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-[#165B40] dark:text-emerald-400">
                  <Sparkles className="w-4 h-4" />
                  <span>One financial habit to improve this month</span>
                </div>

                <div className="p-1 rounded-2xl bg-[#f4f6f4] dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700/60">
                  <textarea
                    rows={2}
                    value={improvementNote}
                    onChange={(e) => setImprovementNote(e.target.value)}
                    placeholder="e.g. Cook wholesome meals at home and avoid impulse online shopping."
                    className="w-full p-3 rounded-xl bg-white dark:bg-zinc-800 text-xs sm:text-sm text-gray-900 dark:text-white outline-none border border-transparent focus:border-[#165B40] resize-none"
                  />
                </div>

                {/* Inspiration Chips */}
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {INTENTION_SUGGESTIONS.map((sugg, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setImprovementNote(sugg)}
                      className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-[11px] text-gray-700 dark:text-zinc-300 transition-colors cursor-pointer text-left"
                    >
                      {sugg}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* =========================================================================
            BOTTOM NAVIGATION ACTIONS BAR (Screenshots 4 - 9)
           ========================================================================= */}
        <div className="px-5 py-3.5 border-t border-gray-100 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 flex items-center space-x-3 shrink-0">
          {/* Back Button (Shown on steps > 0) */}
          {currentStepIndex > 0 ? (
            <button
              type="button"
              onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
              className="w-12 h-12 flex items-center justify-center rounded-2xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-750 transition-colors cursor-pointer shrink-0"
              aria-label="Previous step"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : null}

          {/* Primary Action Button */}
          {currentStepIndex === 0 && (
            <button
              type="button"
              onClick={() => setCurrentStepIndex(1)}
              className="flex-1 h-12 rounded-2xl bg-[#165B40] hover:bg-[#124d35] text-white text-sm font-bold flex items-center justify-center space-x-2 shadow-sm transition-all cursor-pointer"
            >
              <span>Next: Allocate 4 Categories</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {currentStepIndex === 1 && (
            <button
              type="button"
              onClick={() => setCurrentStepIndex(2)}
              className="flex-1 h-12 rounded-2xl bg-[#165B40] hover:bg-[#124d35] text-white text-sm font-bold flex items-center justify-center space-x-2 shadow-sm transition-all cursor-pointer"
            >
              <span>Review &amp; Confirm</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {currentStepIndex === 2 && (
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 h-12 rounded-2xl bg-[#165B40] hover:bg-[#124d35] text-white text-sm font-bold flex items-center justify-center space-x-2 shadow-sm transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Save Monthly Plan</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
