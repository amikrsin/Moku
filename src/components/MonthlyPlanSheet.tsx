import React, { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft, Check, Sparkles, Plus, Trash2 } from 'lucide-react';
import { Plan, CATEGORIES, Category, PlannedSector, DEFAULT_CATEGORY_SECTORS } from '../types';
import { formatCurrency, formatMonthName, generateUUID } from '../lib/storage';
import { AppButton } from './ui/AppButton';
import { MoneyAmount } from './ui/MoneyAmount';

interface MonthlyPlanSheetProps {
  isOpen: boolean;
  onClose: () => void;
  monthKey: string;
  existingPlan: Plan | null;
  onSavePlan: (plan: Plan) => void;
  currency: string;
}

export function MonthlyPlanSheet({
  isOpen,
  onClose,
  monthKey,
  existingPlan,
  onSavePlan,
  currency,
}: MonthlyPlanSheetProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  
  // Step 1: Available Money
  const [incomeStr, setIncomeStr] = useState('');
  const [openingBalanceStr, setOpeningBalanceStr] = useState('0');
  
  // Step 2: Savings Target
  const [savingsTargetStr, setSavingsTargetStr] = useState('');
  
  // Step 3: Category Budgets
  const [catBudgets, setCatBudgets] = useState<Record<Category, number>>({
    survival: 0,
    optional: 0,
    culture: 0,
    extra: 0,
  });

  // Step 4: Planned Sectors per category
  const [sectors, setSectors] = useState<Record<Category, PlannedSector[]>>({
    survival: [],
    optional: [],
    culture: [],
    extra: [],
  });
  
  const [activeSectorTab, setActiveSectorTab] = useState<Category>('survival');
  const [newSectorName, setNewSectorName] = useState('');
  const [newSectorAmount, setNewSectorAmount] = useState('');

  // Step 5: Improvement Note
  const [improvementNote, setImprovementNote] = useState('');

  // Initialize state from existing plan or clean slate
  useEffect(() => {
    if (isOpen) {
      if (existingPlan && ((existingPlan.income && existingPlan.income > 0) || (existingPlan.savingsTarget && existingPlan.savingsTarget > 0) || Object.values(existingPlan.categoryBudgets || {}).some(v => v > 0))) {
        setIncomeStr(String(existingPlan.income || ''));
        setOpeningBalanceStr(String(existingPlan.openingBalance || 0));
        setSavingsTargetStr(String(existingPlan.savingsTarget || ''));
        setCatBudgets(existingPlan.categoryBudgets || {
          survival: 0,
          optional: 0,
          culture: 0,
          extra: 0,
        });
        
        // Populate planned sectors
        const initialSectors: Record<Category, PlannedSector[]> = {
          survival: existingPlan.plannedSectors?.survival?.length 
            ? existingPlan.plannedSectors.survival 
            : generateDefaultSectors('survival', existingPlan.categoryBudgets?.survival || 0),
          optional: existingPlan.plannedSectors?.optional?.length 
            ? existingPlan.plannedSectors.optional 
            : generateDefaultSectors('optional', existingPlan.categoryBudgets?.optional || 0),
          culture: existingPlan.plannedSectors?.culture?.length 
            ? existingPlan.plannedSectors.culture 
            : generateDefaultSectors('culture', existingPlan.categoryBudgets?.culture || 0),
          extra: existingPlan.plannedSectors?.extra?.length 
            ? existingPlan.plannedSectors.extra 
            : generateDefaultSectors('extra', existingPlan.categoryBudgets?.extra || 0),
        };
        setSectors(initialSectors);
        setImprovementNote(existingPlan.improvementNotes || '');
      } else {
        setIncomeStr('');
        setOpeningBalanceStr('0');
        setSavingsTargetStr('');
        
        const initBudgets = {
          survival: 0,
          optional: 0,
          culture: 0,
          extra: 0,
        };
        setCatBudgets(initBudgets);

        setSectors({
          survival: [],
          optional: [],
          culture: [],
          extra: [],
        });
        setImprovementNote('');
      }
      setStep(1);
    }
  }, [isOpen, existingPlan]);

  if (!isOpen) return null;

  function generateDefaultSectors(cat: Category, totalAmount: number): PlannedSector[] {
    const template = DEFAULT_CATEGORY_SECTORS[cat] || [];
    return template.map((item, idx) => ({
      id: `sector-${cat}-${idx + 1}`,
      name: item.name,
      icon: item.icon,
      plannedAmount: Math.round((totalAmount * item.defaultShare) / 100) * 100,
    }));
  }

  const income = parseFloat(incomeStr) || 0;
  const openingBalance = parseFloat(openingBalanceStr) || 0;
  const totalAvailable = income + openingBalance;
  const savingsTarget = parseFloat(savingsTargetStr) || 0;
  const spendableBudget = Math.max(0, totalAvailable - savingsTarget);

  // Compute category budget allocation dynamically from planned sectors
  const getCategoryTotalFromSectors = (cat: Category): number => {
    return (sectors[cat] || []).reduce((sum, s) => sum + (s.plannedAmount || 0), 0);
  };

  const survivalSectorTotal = getCategoryTotalFromSectors('survival');
  const optionalSectorTotal = getCategoryTotalFromSectors('optional');
  const cultureSectorTotal = getCategoryTotalFromSectors('culture');
  const extraSectorTotal = getCategoryTotalFromSectors('extra');

  // Effective category budgets: prioritize sector totals if sectors are defined, otherwise use catBudgets
  const effectiveCategoryBudgets: Record<Category, number> = {
    survival: sectors.survival.length > 0 ? survivalSectorTotal : catBudgets.survival,
    optional: sectors.optional.length > 0 ? optionalSectorTotal : catBudgets.optional,
    culture: sectors.culture.length > 0 ? cultureSectorTotal : catBudgets.culture,
    extra: sectors.extra.length > 0 ? extraSectorTotal : catBudgets.extra,
  };

  const totalAllocatedToCategories = 
    effectiveCategoryBudgets.survival + 
    effectiveCategoryBudgets.optional + 
    effectiveCategoryBudgets.culture + 
    effectiveCategoryBudgets.extra;
  
  const categoryAllocationDiff = spendableBudget - totalAllocatedToCategories;

  // Apply quick allocation split presets
  const applyPreset = (ratios: { survival: number; optional: number; culture: number; extra: number }) => {
    const survival = Math.round(spendableBudget * ratios.survival);
    const optional = Math.round(spendableBudget * ratios.optional);
    const culture = Math.round(spendableBudget * ratios.culture);
    const extra = Math.max(0, spendableBudget - survival - optional - culture);

    const updated = { survival, optional, culture, extra };
    setCatBudgets(updated);

    // Update sector defaults for each category
    setSectors({
      survival: generateDefaultSectors('survival', survival),
      optional: generateDefaultSectors('optional', optional),
      culture: generateDefaultSectors('culture', culture),
      extra: generateDefaultSectors('extra', extra),
    });
  };

  const handleUpdateSectorAmount = (cat: Category, sectorId: string, newAmt: number) => {
    const validAmt = Math.max(0, newAmt);
    setSectors(prev => {
      const updatedCatSectors = prev[cat].map(s => s.id === sectorId ? { ...s, plannedAmount: validAmt } : s);
      const newCatTotal = updatedCatSectors.reduce((sum, s) => sum + (s.plannedAmount || 0), 0);
      setCatBudgets(cb => ({ ...cb, [cat]: newCatTotal }));
      return {
        ...prev,
        [cat]: updatedCatSectors,
      };
    });
  };

  const handleRemoveSector = (cat: Category, sectorId: string) => {
    setSectors(prev => {
      const updatedCatSectors = prev[cat].filter(s => s.id !== sectorId);
      const newCatTotal = updatedCatSectors.reduce((sum, s) => sum + (s.plannedAmount || 0), 0);
      setCatBudgets(cb => ({ ...cb, [cat]: newCatTotal }));
      return {
        ...prev,
        [cat]: updatedCatSectors,
      };
    });
  };

  const handleAddCustomSector = (cat: Category) => {
    if (!newSectorName.trim()) return;
    const amount = parseFloat(newSectorAmount) || 0;
    const newSector: PlannedSector = {
      id: generateUUID(),
      name: newSectorName.trim(),
      plannedAmount: amount,
      icon: cat === 'survival' ? '🏠' : cat === 'optional' ? '✨' : cat === 'culture' ? '📚' : '⚡',
    };
    setSectors(prev => {
      const updatedCatSectors = [...prev[cat], newSector];
      const newCatTotal = updatedCatSectors.reduce((sum, s) => sum + (s.plannedAmount || 0), 0);
      setCatBudgets(cb => ({ ...cb, [cat]: newCatTotal }));
      return {
        ...prev,
        [cat]: updatedCatSectors,
      };
    });
    setNewSectorName('');
    setNewSectorAmount('');
  };

  const handleAddSuggestedSector = (cat: Category, templateName: string, icon: string, defaultShare: number) => {
    // Check if already in sectors
    const existing = (sectors[cat] || []).find(s => s.name.toLowerCase() === templateName.toLowerCase());
    if (existing) {
      return;
    }

    const unallocated = Math.max(0, categoryAllocationDiff);
    const suggestedAmt = Math.round((spendableBudget * defaultShare) / 100) * 100 || (unallocated > 0 ? Math.round(unallocated * 0.3) : 1000);

    const newSector: PlannedSector = {
      id: generateUUID(),
      name: templateName,
      plannedAmount: suggestedAmt,
      icon: icon,
    };

    setSectors(prev => {
      const updatedCatSectors = [...prev[cat], newSector];
      const newCatTotal = updatedCatSectors.reduce((sum, s) => sum + (s.plannedAmount || 0), 0);
      setCatBudgets(cb => ({ ...cb, [cat]: newCatTotal }));
      return {
        ...prev,
        [cat]: updatedCatSectors,
      };
    });
  };

  const handleFinish = () => {
    const finalCategoryBudgets: Record<Category, number> = {
      survival: sectors.survival.length > 0 ? getCategoryTotalFromSectors('survival') : catBudgets.survival,
      optional: sectors.optional.length > 0 ? getCategoryTotalFromSectors('optional') : catBudgets.optional,
      culture: sectors.culture.length > 0 ? getCategoryTotalFromSectors('culture') : catBudgets.culture,
      extra: sectors.extra.length > 0 ? getCategoryTotalFromSectors('extra') : catBudgets.extra,
    };

    const finalTotalExpenses = 
      finalCategoryBudgets.survival +
      finalCategoryBudgets.optional +
      finalCategoryBudgets.culture +
      finalCategoryBudgets.extra;

    const newPlan: Plan = {
      monthKey,
      income: totalAvailable,
      openingBalance,
      otherIncome: 0,
      savingsTarget,
      totalExpenses: finalTotalExpenses > 0 ? finalTotalExpenses : spendableBudget,
      improvementNotes: improvementNote || 'Conscious and intentional spending.',
      categoryBudgets: finalCategoryBudgets,
      plannedSectors: sectors,
      currency,
      reflection: existingPlan?.reflection || '',
      updatedAt: Date.now(),
    };

    onSavePlan(newPlan);
    onClose();
  };

  const currencySymbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-xs"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md bg-[var(--moku-surface)] rounded-t-[28px] p-6 shadow-2xl z-10 border-t border-[var(--moku-outline)] max-h-[92vh] overflow-y-auto">
        <div className="w-12 h-1.5 bg-[var(--moku-outline)] rounded-full mx-auto mb-4" />

        {/* Header with Progress Steps */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--moku-primary)]">
              {formatMonthName(monthKey)} · Step {step} of 5
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-[var(--moku-text-secondary)] hover:bg-[var(--moku-surface-secondary)] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="w-full bg-[var(--moku-surface-secondary)] h-1.5 rounded-full overflow-hidden mb-3">
            <div 
              className="bg-[var(--moku-primary)] h-full transition-all duration-300 rounded-full" 
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>

          <h2 className="text-xl font-bold text-[var(--moku-text-primary)]">
            {step === 1 && '1. Available Money'}
            {step === 2 && '2. Savings Commitment'}
            {step === 3 && '3. Category Allocation'}
            {step === 4 && '4. Planned Spending Sectors'}
            {step === 5 && '5. Review & Intentions'}
          </h2>
          <p className="text-xs text-[var(--moku-text-secondary)] mt-0.5">
            {step === 1 && 'Determine your total inflows and opening carryover for the month.'}
            {step === 2 && 'Pay yourself first before budgeting any expense.'}
            {step === 3 && 'Distribute your spendable budget across the 4 Kakeibo pillars.'}
            {step === 4 && 'Plan specific expense items (Rent, Groceries, SIP, etc.)'}
            {step === 5 && 'Set a mindful habit and confirm your monthly blueprint.'}
          </p>
        </div>

        {/* STEP 1: Available Money */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--moku-text-secondary)] uppercase tracking-wider mb-1.5">
                Expected Monthly Income
              </label>
              <div className="flex items-center px-4 h-13 rounded-2xl border border-[var(--moku-outline)] bg-[var(--moku-surface-secondary)] focus-within:ring-2 focus-within:ring-[var(--moku-primary)]">
                <span className="text-lg font-bold text-[var(--moku-primary)] mr-2">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  value={incomeStr}
                  onChange={(e) => setIncomeStr(e.target.value)}
                  className="w-full text-xl font-bold bg-transparent outline-none font-tabular text-[var(--moku-text-primary)]"
                  placeholder="e.g. 50000"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--moku-text-secondary)] uppercase tracking-wider mb-1.5">
                Opening Balance / Carryover
              </label>
              <div className="flex items-center px-4 h-13 rounded-2xl border border-[var(--moku-outline)] bg-[var(--moku-surface-secondary)] focus-within:ring-2 focus-within:ring-[var(--moku-primary)]">
                <span className="text-lg font-bold text-[var(--moku-text-secondary)] mr-2">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  value={openingBalanceStr}
                  onChange={(e) => setOpeningBalanceStr(e.target.value)}
                  className="w-full text-xl font-bold bg-transparent outline-none font-tabular text-[var(--moku-text-primary)]"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--moku-surface-secondary)] flex items-center justify-between border border-[var(--moku-outline)]">
              <div>
                <span className="text-xs font-semibold text-[var(--moku-text-secondary)] block">Total Available Pool</span>
                <span className="text-[11px] text-[var(--moku-primary)] font-medium">Income + Carryover</span>
              </div>
              <MoneyAmount
                amount={totalAvailable}
                currency={currency}
                size="xl"
                weight="extrabold"
              />
            </div>

            <AppButton
              fullWidth
              size="lg"
              onClick={() => setStep(2)}
              icon={<ArrowRight className="w-4 h-4" />}
              iconPosition="right"
            >
              Next: Set Savings Goal
            </AppButton>
          </div>
        )}

        {/* STEP 2: Savings Commitment */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--moku-text-secondary)] uppercase tracking-wider mb-1.5">
                Target Monthly Savings
              </label>
              <div className="flex items-center px-4 h-13 rounded-2xl border border-[var(--moku-outline)] bg-[var(--moku-surface-secondary)] focus-within:ring-2 focus-within:ring-[var(--moku-primary)]">
                <span className="text-lg font-bold text-[var(--moku-primary)] mr-2">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  value={savingsTargetStr}
                  onChange={(e) => setSavingsTargetStr(e.target.value)}
                  className="w-full text-xl font-bold bg-transparent outline-none font-tabular text-[var(--moku-text-primary)]"
                />
              </div>
            </div>

            {/* Quick Savings Percentage Buttons */}
            <div className="flex items-center space-x-2">
              {[15, 20, 25, 30].map(pct => {
                const calculated = Math.round((totalAvailable * pct) / 100);
                const isSelected = Math.abs(savingsTarget - calculated) < 50;
                return (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setSavingsTargetStr(String(calculated))}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--moku-primary)] text-white border-[var(--moku-primary)]'
                        : 'bg-[var(--moku-surface-secondary)] text-[var(--moku-text-secondary)] border-[var(--moku-outline)]'
                    }`}
                  >
                    {pct}%
                  </button>
                );
              })}
            </div>

            {/* Core Kakeibo Deduction Formula */}
            <div className="p-4 rounded-2xl bg-[var(--moku-primary-container)] border border-[var(--moku-primary)]/20 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-[var(--moku-text-primary)]">
                <span>Total Available Money</span>
                <MoneyAmount amount={totalAvailable} currency={currency} size="sm" weight="bold" />
              </div>
              <div className="flex items-center justify-between text-xs text-[var(--moku-primary)]">
                <span>Committed Savings Target</span>
                <span className="font-bold font-tabular">−{formatCurrency(savingsTarget, currency)}</span>
              </div>
              <div className="pt-2 border-t border-[var(--moku-primary)]/20 flex items-center justify-between text-sm font-bold text-[var(--moku-text-primary)]">
                <span>Available to Spend</span>
                <MoneyAmount amount={spendableBudget} currency={currency} size="xl" weight="extrabold" color="primary" />
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 h-13 rounded-2xl border border-[var(--moku-outline)] text-xs font-semibold text-[var(--moku-text-secondary)] cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <AppButton
                fullWidth
                size="lg"
                onClick={() => setStep(3)}
                icon={<ArrowRight className="w-4 h-4" />}
                iconPosition="right"
              >
                Allocate 4 Categories
              </AppButton>
            </div>
          </div>
        )}

        {/* STEP 3: 4 Category Allocation */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-[var(--moku-surface-secondary)] border border-[var(--moku-outline)] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--moku-text-secondary)]">Available Spendable Pool:</span>
                <strong className="text-[var(--moku-text-primary)] font-tabular text-sm">
                  {formatCurrency(spendableBudget, currency)}
                </strong>
              </div>
              <div className="flex items-center justify-between text-xs pt-1.5 border-t border-[var(--moku-outline)]">
                <span className="text-[var(--moku-text-secondary)]">Identified Sector Allocation:</span>
                <strong className={`font-tabular text-sm font-bold ${categoryAllocationDiff === 0 ? 'text-[var(--moku-primary)]' : categoryAllocationDiff > 0 ? 'text-amber-600' : 'text-[var(--moku-danger)]'}`}>
                  {formatCurrency(totalAllocatedToCategories, currency)}
                </strong>
              </div>
              <div className="text-[11px] flex items-center justify-between">
                <span className="text-[var(--moku-text-secondary)]">Status:</span>
                <span className={`font-semibold ${categoryAllocationDiff === 0 ? 'text-[var(--moku-primary)]' : categoryAllocationDiff > 0 ? 'text-amber-600' : 'text-[var(--moku-danger)]'}`}>
                  {categoryAllocationDiff === 0 && '✨ 100% Allocated (Balanced)'}
                  {categoryAllocationDiff > 0 && `${formatCurrency(categoryAllocationDiff, currency)} Unallocated`}
                  {categoryAllocationDiff < 0 && `${formatCurrency(Math.abs(categoryAllocationDiff), currency)} Over Budget`}
                </span>
              </div>
            </div>

            {/* Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-[var(--moku-text-secondary)] uppercase tracking-wider block">
                Quick Category Presets
              </span>
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => applyPreset({ survival: 0.55, optional: 0.22, culture: 0.11, extra: 0.12 })}
                  className="flex-1 py-2 px-2 text-[11px] font-bold rounded-xl border border-[var(--moku-outline)] bg-[var(--moku-surface-secondary)] text-[var(--moku-text-primary)] cursor-pointer hover:border-[var(--moku-primary)] transition-colors"
                >
                  Balanced (55/22/11/12)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset({ survival: 0.65, optional: 0.15, culture: 0.10, extra: 0.10 })}
                  className="flex-1 py-2 px-2 text-[11px] font-bold rounded-xl border border-[var(--moku-outline)] bg-[var(--moku-surface-secondary)] text-[var(--moku-text-primary)] cursor-pointer hover:border-[var(--moku-primary)] transition-colors"
                >
                  Essential-Heavy
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset({ survival: 0.45, optional: 0.30, culture: 0.15, extra: 0.10 })}
                  className="flex-1 py-2 px-2 text-[11px] font-bold rounded-xl border border-[var(--moku-outline)] bg-[var(--moku-surface-secondary)] text-[var(--moku-text-primary)] cursor-pointer hover:border-[var(--moku-primary)] transition-colors"
                >
                  Lifestyle
                </button>
              </div>
            </div>

            {/* 4 Category Inputs with Sector Counts */}
            <div className="space-y-2.5">
              {(Object.keys(CATEGORIES) as Category[]).map(catKey => {
                const catInfo = CATEGORIES[catKey];
                const catSectorList = sectors[catKey] || [];
                const catSectorSum = getCategoryTotalFromSectors(catKey);
                const val = catSectorList.length > 0 ? catSectorSum : (catBudgets[catKey] || 0);
                const percentage = spendableBudget > 0 ? Math.round((val / spendableBudget) * 100) : 0;
                
                return (
                  <div 
                    key={catKey}
                    className="p-3.5 rounded-2xl border border-[var(--moku-outline)] bg-[var(--moku-surface-secondary)] space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-xl">{catInfo.icon}</span>
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="text-xs font-bold text-[var(--moku-text-primary)]">
                              {catInfo.name}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--moku-surface)] border border-[var(--moku-outline)] text-[var(--moku-text-secondary)] font-medium">
                              {catSectorList.length} {catSectorList.length === 1 ? 'sector' : 'sectors'}
                            </span>
                          </div>
                          <span className="text-[10px] text-[var(--moku-text-secondary)] block">
                            {catInfo.description}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-[var(--moku-primary)]">
                        {percentage}%
                      </span>
                    </div>

                    <div className="flex items-center px-3 h-11 rounded-xl bg-[var(--moku-surface)] border border-[var(--moku-outline)]">
                      <span className="text-sm font-bold text-[var(--moku-text-secondary)] mr-1.5">{currencySymbol}</span>
                      <input
                        type="number"
                        value={val || ''}
                        placeholder="0"
                        onChange={(e) => {
                          const num = parseFloat(e.target.value) || 0;
                          setCatBudgets(prev => ({ ...prev, [catKey]: num }));
                          // Automatically distribute or create default sectors for this category
                          if (catSectorList.length === 0 && num > 0) {
                            setSectors(prev => ({
                              ...prev,
                              [catKey]: generateDefaultSectors(catKey, num),
                            }));
                          } else if (catSectorList.length > 0) {
                            // Scale existing sectors proportionally
                            const currentTotal = catSectorSum || 1;
                            const factor = num / currentTotal;
                            setSectors(prev => ({
                              ...prev,
                              [catKey]: prev[catKey].map(s => ({
                                ...s,
                                plannedAmount: Math.round(s.plannedAmount * factor),
                              })),
                            }));
                          }
                        }}
                        className="w-full text-base font-bold bg-transparent outline-none font-tabular text-[var(--moku-text-primary)]"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 h-13 rounded-2xl border border-[var(--moku-outline)] text-xs font-semibold text-[var(--moku-text-secondary)] cursor-pointer hover:bg-[var(--moku-surface-secondary)]"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <AppButton
                fullWidth
                size="lg"
                onClick={() => setStep(4)}
                icon={<ArrowRight className="w-4 h-4" />}
                iconPosition="right"
              >
                Plan Spending Sectors
              </AppButton>
            </div>
          </div>
        )}

        {/* STEP 4: Planned Expense Sectors */}
        {step === 4 && (
          <div className="space-y-4">
            {/* Total Budget Allocation Overview Bar */}
            <div className="p-3.5 rounded-2xl bg-[var(--moku-surface-secondary)] border border-[var(--moku-outline)] space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--moku-text-secondary)] block">
                    Total Sector Allocation
                  </span>
                  <strong className="text-base font-extrabold text-[var(--moku-text-primary)] font-tabular">
                    {formatCurrency(totalAllocatedToCategories, currency)}
                  </strong>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--moku-text-secondary)] block">
                    Spendable Target
                  </span>
                  <span className="text-xs font-bold text-[var(--moku-text-secondary)] font-tabular">
                    {formatCurrency(spendableBudget, currency)}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[var(--moku-outline)]">
                <span className="text-[var(--moku-text-secondary)]">Allocation Balance:</span>
                <span className={`font-bold ${categoryAllocationDiff === 0 ? 'text-[var(--moku-primary)]' : categoryAllocationDiff > 0 ? 'text-amber-600' : 'text-[var(--moku-danger)]'}`}>
                  {categoryAllocationDiff === 0 && '✨ Exact 100% Match'}
                  {categoryAllocationDiff > 0 && `${formatCurrency(categoryAllocationDiff, currency)} left to assign`}
                  {categoryAllocationDiff < 0 && `${formatCurrency(Math.abs(categoryAllocationDiff), currency)} over budget`}
                </span>
              </div>
            </div>

            {/* Category Tabs */}
            <div className="flex space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
              {(Object.keys(CATEGORIES) as Category[]).map(catKey => {
                const info = CATEGORIES[catKey];
                const isSelected = activeSectorTab === catKey;
                const catSum = getCategoryTotalFromSectors(catKey);
                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => setActiveSectorTab(catKey)}
                    className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors border cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--moku-primary)] text-white border-[var(--moku-primary)] shadow-2xs'
                        : 'bg-[var(--moku-surface-secondary)] text-[var(--moku-text-secondary)] border-[var(--moku-outline)] hover:text-[var(--moku-text-primary)]'
                    }`}
                  >
                    <span>{info.icon}</span>
                    <span>{info.name}</span>
                    <span className={`text-[10px] font-tabular ml-1 px-1.5 py-0.2 rounded-md ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-[var(--moku-surface)] text-[var(--moku-text-secondary)]'
                    }`}>
                      {formatCurrency(catSum, currency)}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Header info for selected category */}
            <div className="p-3 rounded-xl bg-[var(--moku-primary-container)] border border-[var(--moku-primary)]/20 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <span className="text-xl">{CATEGORIES[activeSectorTab].icon}</span>
                <div>
                  <span className="font-bold text-[var(--moku-text-primary)] block">
                    {CATEGORIES[activeSectorTab].name} Budget
                  </span>
                  <span className="text-[10px] text-[var(--moku-text-secondary)]">
                    {(sectors[activeSectorTab] || []).length} planned spending sectors
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-[var(--moku-text-secondary)] block">Category Total</span>
                <strong className="text-sm font-extrabold text-[var(--moku-primary)] font-tabular">
                  {formatCurrency(getCategoryTotalFromSectors(activeSectorTab), currency)}
                </strong>
              </div>
            </div>

            {/* Quick Suggestion Chips for Active Category */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-[var(--moku-text-secondary)] uppercase tracking-wider block">
                Quick-Add {CATEGORIES[activeSectorTab].name} Sectors
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(DEFAULT_CATEGORY_SECTORS[activeSectorTab] || []).map(tpl => {
                  const isAdded = (sectors[activeSectorTab] || []).some(
                    s => s.name.toLowerCase() === tpl.name.toLowerCase()
                  );
                  return (
                    <button
                      key={tpl.name}
                      type="button"
                      onClick={() => handleAddSuggestedSector(activeSectorTab, tpl.name, tpl.icon, tpl.defaultShare)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 border transition-all cursor-pointer ${
                        isAdded
                          ? 'bg-[var(--moku-surface-secondary)] text-[var(--moku-text-secondary)] border-[var(--moku-outline)] opacity-70'
                          : 'bg-[var(--moku-surface)] text-[var(--moku-text-primary)] border-[var(--moku-outline)] hover:border-[var(--moku-primary)] hover:text-[var(--moku-primary)]'
                      }`}
                    >
                      <span>{tpl.icon}</span>
                      <span>{tpl.name}</span>
                      {isAdded ? (
                        <Check className="w-3 h-3 text-[var(--moku-primary)]" />
                      ) : (
                        <Plus className="w-3 h-3 text-[var(--moku-text-secondary)]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* List of Sectors */}
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {(sectors[activeSectorTab] || []).map(sec => {
                const catTotal = getCategoryTotalFromSectors(activeSectorTab);
                const sharePct = catTotal > 0 ? Math.round((sec.plannedAmount / catTotal) * 100) : 0;
                return (
                  <div 
                    key={sec.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--moku-outline)] bg-[var(--moku-surface)] shadow-2xs"
                  >
                    <div className="flex items-center space-x-2 min-w-0 pr-2">
                      <span className="text-base shrink-0">{sec.icon || '📌'}</span>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-[var(--moku-text-primary)] block truncate">
                          {sec.name}
                        </span>
                        <span className="text-[10px] text-[var(--moku-text-secondary)] font-medium">
                          {sharePct}% of category
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      <div className="flex items-center px-2 h-8 rounded-lg bg-[var(--moku-surface-secondary)] border border-[var(--moku-outline)] w-28 focus-within:ring-1 focus-within:ring-[var(--moku-primary)]">
                        <span className="text-[11px] font-bold text-[var(--moku-text-secondary)] mr-1">{currencySymbol}</span>
                        <input
                          type="number"
                          value={sec.plannedAmount || ''}
                          placeholder="0"
                          onChange={(e) => handleUpdateSectorAmount(activeSectorTab, sec.id, parseFloat(e.target.value) || 0)}
                          className="w-full text-xs font-bold bg-transparent outline-none font-tabular text-[var(--moku-text-primary)]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSector(activeSectorTab, sec.id)}
                        className="p-1.5 rounded-lg text-[var(--moku-text-secondary)] hover:text-[var(--moku-danger)] hover:bg-[var(--moku-surface-secondary)] cursor-pointer"
                        title="Delete sector"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {(sectors[activeSectorTab] || []).length === 0 && (
                <div className="text-center py-6 px-4 rounded-xl border border-dashed border-[var(--moku-outline)] text-xs text-[var(--moku-text-secondary)]">
                  No planned sectors added for {CATEGORIES[activeSectorTab].name} yet. Click a quick suggestion above or add a custom sector below.
                </div>
              )}
            </div>

            {/* Add Custom Sector */}
            <div className="flex items-center space-x-2 pt-1">
              <input
                type="text"
                value={newSectorName}
                onChange={(e) => setNewSectorName(e.target.value)}
                placeholder="Custom sector (e.g. WiFi, Car Insurance)"
                className="flex-1 h-10 px-3 text-xs rounded-xl border border-[var(--moku-outline)] bg-[var(--moku-surface-secondary)] text-[var(--moku-text-primary)] outline-none focus:ring-1 focus:ring-[var(--moku-primary)]"
              />
              <input
                type="number"
                value={newSectorAmount}
                onChange={(e) => setNewSectorAmount(e.target.value)}
                placeholder="Amount"
                className="w-24 h-10 px-2.5 text-xs font-tabular rounded-xl border border-[var(--moku-outline)] bg-[var(--moku-surface-secondary)] text-[var(--moku-text-primary)] outline-none focus:ring-1 focus:ring-[var(--moku-primary)]"
              />
              <button
                type="button"
                onClick={() => handleAddCustomSector(activeSectorTab)}
                className="h-10 px-3 rounded-xl bg-[var(--moku-primary)] text-white text-xs font-bold flex items-center space-x-1 cursor-pointer shrink-0 hover:opacity-90"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-4 h-13 rounded-2xl border border-[var(--moku-outline)] text-xs font-semibold text-[var(--moku-text-secondary)] cursor-pointer hover:bg-[var(--moku-surface-secondary)]"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <AppButton
                fullWidth
                size="lg"
                onClick={() => setStep(5)}
                icon={<ArrowRight className="w-4 h-4" />}
                iconPosition="right"
              >
                Review & Confirm
              </AppButton>
            </div>
          </div>
        )}

        {/* STEP 5: Review & Intentions */}
        {step === 5 && (
          <div className="space-y-4">
            {/* Blueprint Summary Card */}
            <div className="p-4 rounded-2xl bg-[var(--moku-surface-secondary)] border border-[var(--moku-outline)] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--moku-outline)]">
                <span className="text-xs text-[var(--moku-text-secondary)]">Total Available Inflows</span>
                <MoneyAmount amount={totalAvailable} currency={currency} size="sm" weight="bold" />
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-[var(--moku-outline)]">
                <span className="text-xs text-[var(--moku-primary)] font-medium">Committed Savings</span>
                <MoneyAmount amount={savingsTarget} currency={currency} size="sm" weight="bold" color="primary" />
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-[var(--moku-outline)]">
                <span className="text-xs font-bold text-[var(--moku-text-primary)]">
                  Identified Monthly Spending Allocation
                </span>
                <MoneyAmount amount={totalAllocatedToCategories} currency={currency} size="lg" weight="extrabold" color="primary" />
              </div>

              {/* 4 Pillars Itemized Breakdown */}
              <div className="space-y-2 pt-1">
                {(Object.keys(CATEGORIES) as Category[]).map(catKey => {
                  const catInfo = CATEGORIES[catKey];
                  const catSectorList = sectors[catKey] || [];
                  const catTotal = getCategoryTotalFromSectors(catKey);
                  return (
                    <div 
                      key={catKey}
                      className="p-2.5 rounded-xl bg-[var(--moku-surface)] border border-[var(--moku-outline)] space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-1.5">
                          <span>{catInfo.icon}</span>
                          <span className="font-bold text-[var(--moku-text-primary)]">{catInfo.name}</span>
                          <span className="text-[10px] text-[var(--moku-text-secondary)]">
                            ({catSectorList.length} {catSectorList.length === 1 ? 'sector' : 'sectors'})
                          </span>
                        </div>
                        <MoneyAmount amount={catTotal} currency={currency} size="xs" weight="bold" />
                      </div>

                      {catSectorList.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {catSectorList.map(s => (
                            <span 
                              key={s.id} 
                              className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--moku-surface-secondary)] border border-[var(--moku-outline)] text-[var(--moku-text-secondary)] font-medium font-tabular flex items-center space-x-1"
                            >
                              <span>{s.icon || '📌'}</span>
                              <span>{s.name}:</span>
                              <strong className="text-[var(--moku-text-primary)]">{formatCurrency(s.plannedAmount, currency)}</strong>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mindful Habit Question (Kakeibo core question 4) */}
            <div>
              <label className="block text-xs font-bold text-[var(--moku-text-primary)] mb-1.5 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[var(--moku-primary)]" />
                <span>One financial habit to improve this month</span>
              </label>
              <textarea
                value={improvementNote}
                onChange={(e) => setImprovementNote(e.target.value)}
                placeholder="e.g. Cook fresh at home, pause 24h before non-essential purchases..."
                rows={2}
                className="w-full p-3 rounded-2xl border border-[var(--moku-outline)] bg-[var(--moku-surface-secondary)] text-xs text-[var(--moku-text-primary)] outline-none resize-none focus:ring-1 focus:ring-[var(--moku-primary)]"
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(4)}
                className="px-4 h-13 rounded-2xl border border-[var(--moku-outline)] text-xs font-semibold text-[var(--moku-text-secondary)] cursor-pointer hover:bg-[var(--moku-surface-secondary)]"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <AppButton
                fullWidth
                size="lg"
                onClick={handleFinish}
                icon={<Check className="w-4 h-4" />}
              >
                Save Monthly Plan
              </AppButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
