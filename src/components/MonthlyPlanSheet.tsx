import React, { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft, Check, Sparkles, Plus, Trash2 } from 'lucide-react';
import { Plan, CATEGORIES, Category, PlannedSector, DEFAULT_CATEGORY_SECTORS } from '../types';
import { formatCurrency, formatMonthName, generateUUID } from '../lib/storage';

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
  const [incomeStr, setIncomeStr] = useState('50000');
  const [openingBalanceStr, setOpeningBalanceStr] = useState('5000');
  
  // Step 2: Savings Target
  const [savingsTargetStr, setSavingsTargetStr] = useState('10000');
  
  // Step 3: Category Budgets
  const [catBudgets, setCatBudgets] = useState<Record<Category, number>>({
    survival: 25000,
    optional: 10000,
    culture: 5000,
    extra: 5000,
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

  // Initialize state from existing plan or intelligent defaults
  useEffect(() => {
    if (isOpen) {
      if (existingPlan) {
        setIncomeStr(String(existingPlan.income || 50000));
        setOpeningBalanceStr(String(existingPlan.openingBalance || 0));
        setSavingsTargetStr(String(existingPlan.savingsTarget || 10000));
        setCatBudgets(existingPlan.categoryBudgets || {
          survival: 22000,
          optional: 8000,
          culture: 5000,
          extra: 5000,
        });
        
        // Populate planned sectors
        const initialSectors: Record<Category, PlannedSector[]> = {
          survival: existingPlan.plannedSectors?.survival?.length 
            ? existingPlan.plannedSectors.survival 
            : generateDefaultSectors('survival', existingPlan.categoryBudgets?.survival || 22000),
          optional: existingPlan.plannedSectors?.optional?.length 
            ? existingPlan.plannedSectors.optional 
            : generateDefaultSectors('optional', existingPlan.categoryBudgets?.optional || 8000),
          culture: existingPlan.plannedSectors?.culture?.length 
            ? existingPlan.plannedSectors.culture 
            : generateDefaultSectors('culture', existingPlan.categoryBudgets?.culture || 5000),
          extra: existingPlan.plannedSectors?.extra?.length 
            ? existingPlan.plannedSectors.extra 
            : generateDefaultSectors('extra', existingPlan.categoryBudgets?.extra || 5000),
        };
        setSectors(initialSectors);
        setImprovementNote(existingPlan.improvementNotes || '');
      } else {
        setIncomeStr('50000');
        setOpeningBalanceStr('5000');
        setSavingsTargetStr('10000');
        const defaultSpendable = 45000;
        const initialSurvival = Math.round(defaultSpendable * 0.55);
        const initialOptional = Math.round(defaultSpendable * 0.22);
        const initialCulture = Math.round(defaultSpendable * 0.11);
        const initialExtra = defaultSpendable - initialSurvival - initialOptional - initialCulture;
        
        const initBudgets = {
          survival: initialSurvival,
          optional: initialOptional,
          culture: initialCulture,
          extra: initialExtra,
        };
        setCatBudgets(initBudgets);

        setSectors({
          survival: generateDefaultSectors('survival', initialSurvival),
          optional: generateDefaultSectors('optional', initialOptional),
          culture: generateDefaultSectors('culture', initialCulture),
          extra: generateDefaultSectors('extra', initialExtra),
        });
        setImprovementNote('Cook fresh at home, avoid impulse takeout, and learn mindfully.');
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

  const totalAllocatedToCategories = 
    catBudgets.survival + catBudgets.optional + catBudgets.culture + catBudgets.extra;
  
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
    setSectors(prev => ({
      ...prev,
      [cat]: prev[cat].map(s => s.id === sectorId ? { ...s, plannedAmount: Math.max(0, newAmt) } : s),
    }));
  };

  const handleRemoveSector = (cat: Category, sectorId: string) => {
    setSectors(prev => ({
      ...prev,
      [cat]: prev[cat].filter(s => s.id !== sectorId),
    }));
  };

  const handleAddCustomSector = (cat: Category) => {
    if (!newSectorName.trim()) return;
    const amount = parseFloat(newSectorAmount) || 0;
    const newSector: PlannedSector = {
      id: generateUUID(),
      name: newSectorName.trim(),
      plannedAmount: amount,
      icon: cat === 'survival' ? '🏠' : cat === 'optional' ? '🛍️' : cat === 'culture' ? '📚' : '⚡',
    };
    setSectors(prev => ({
      ...prev,
      [cat]: [...prev[cat], newSector],
    }));
    setNewSectorName('');
    setNewSectorAmount('');
  };

  const handleFinish = () => {
    const newPlan: Plan = {
      monthKey,
      income: totalAvailable,
      openingBalance,
      otherIncome: 0,
      savingsTarget,
      totalExpenses: spendableBudget,
      improvementNotes: improvementNote || 'Conscious and intentional spending.',
      categoryBudgets: catBudgets,
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

      <div className="relative w-full max-w-md bg-white dark:bg-[#1B1E1B] rounded-t-[28px] p-6 shadow-2xl z-10 border-t border-[#DDE2DD] dark:border-[#414842] max-h-[92vh] overflow-y-auto">
        <div className="w-12 h-1.5 bg-[#DDE2DD] dark:bg-[#414842] rounded-full mx-auto mb-4" />

        {/* Header with Progress Steps */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#176B52] dark:text-[#82D9B4]">
              {formatMonthName(monthKey)} · Step {step} of 5
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-[#6E736F] dark:text-[#C1C7C0] hover:bg-[#EEF1EE] dark:hover:bg-[#252925]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="w-full bg-[#EEF1EE] dark:bg-[#2B312B] h-1.5 rounded-full overflow-hidden mb-3">
            <div 
              className="bg-[#176B52] dark:bg-[#82D9B4] h-full transition-all duration-300 rounded-full" 
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>

          <h2 className="text-xl font-bold text-[#1A1C1A] dark:text-[#E3E5E1]">
            {step === 1 && '1. Available Money'}
            {step === 2 && '2. Savings Commitment'}
            {step === 3 && '3. Category Allocation'}
            {step === 4 && '4. Planned Spending Sectors'}
            {step === 5 && '5. Review & Intentions'}
          </h2>
          <p className="text-xs text-[#6E736F] dark:text-[#C1C7C0] mt-0.5">
            {step === 1 && 'Determine your total inflows and carryover for the month.'}
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
              <label className="block text-xs font-semibold text-[#6E736F] dark:text-[#C1C7C0] uppercase tracking-wider mb-1.5">
                Expected Monthly Income
              </label>
              <div className="flex items-center px-4 h-13 rounded-2xl border border-[#DDE2DD] dark:border-[#414842] bg-[#F7F8F7] dark:bg-[#252925] focus-within:ring-2 focus-within:ring-[#176B52]">
                <span className="text-lg font-bold text-[#176B52] dark:text-[#82D9B4] mr-2">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  value={incomeStr}
                  onChange={(e) => setIncomeStr(e.target.value)}
                  className="w-full text-xl font-bold bg-transparent outline-none font-tabular text-[#1A1C1A] dark:text-[#E3E5E1]"
                  placeholder="50000"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#6E736F] dark:text-[#C1C7C0] uppercase tracking-wider mb-1.5">
                Opening Balance / Carryover
              </label>
              <div className="flex items-center px-4 h-13 rounded-2xl border border-[#DDE2DD] dark:border-[#414842] bg-[#F7F8F7] dark:bg-[#252925] focus-within:ring-2 focus-within:ring-[#176B52]">
                <span className="text-lg font-bold text-[#6E736F] mr-2">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  value={openingBalanceStr}
                  onChange={(e) => setOpeningBalanceStr(e.target.value)}
                  className="w-full text-xl font-bold bg-transparent outline-none font-tabular text-[#1A1C1A] dark:text-[#E3E5E1]"
                  placeholder="5000"
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#EEF1EE] dark:bg-[#252925] flex items-center justify-between border border-[#DDE2DD] dark:border-[#414842]">
              <div>
                <span className="text-xs font-semibold text-[#6E736F] dark:text-[#C1C7C0] block">Total Available Pool</span>
                <span className="text-[11px] text-[#6E736F] dark:text-[#82D9B4]">Income + Carryover</span>
              </div>
              <strong className="text-xl font-extrabold text-[#1A1C1A] dark:text-[#E3E5E1] font-tabular">
                {formatCurrency(totalAvailable, currency)}
              </strong>
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full h-13 rounded-2xl bg-[#176B52] hover:bg-[#125843] dark:bg-[#82D9B4] dark:hover:bg-[#6ec29e] text-white dark:text-[#121412] font-bold text-sm shadow-md flex items-center justify-center space-x-2 cursor-pointer active:scale-98"
            >
              <span>Next: Set Savings Goal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2: Savings Commitment */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#6E736F] dark:text-[#C1C7C0] uppercase tracking-wider mb-1.5">
                Target Monthly Savings
              </label>
              <div className="flex items-center px-4 h-13 rounded-2xl border border-[#DDE2DD] dark:border-[#414842] bg-[#F7F8F7] dark:bg-[#252925] focus-within:ring-2 focus-within:ring-[#176B52]">
                <span className="text-lg font-bold text-[#176B52] dark:text-[#82D9B4] mr-2">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  value={savingsTargetStr}
                  onChange={(e) => setSavingsTargetStr(e.target.value)}
                  className="w-full text-xl font-bold bg-transparent outline-none font-tabular text-[#1A1C1A] dark:text-[#E3E5E1]"
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
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${
                      isSelected
                        ? 'bg-[#176B52] text-white border-[#176B52] dark:bg-[#82D9B4] dark:text-[#121412]'
                        : 'bg-[#F7F8F7] dark:bg-[#252925] text-[#6E736F] dark:text-[#C1C7C0] border-[#DDE2DD] dark:border-[#414842]'
                    }`}
                  >
                    {pct}%
                  </button>
                );
              })}
            </div>

            {/* Core Kakeibo Deduction Formula */}
            <div className="p-4 rounded-2xl bg-[#D8F3E7]/70 dark:bg-[#214C3D]/60 border border-[#176B52]/20 dark:border-[#82D9B4]/30 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-[#1A1C1A] dark:text-[#E3E5E1]">
                <span>Total Available Money</span>
                <span className="font-bold font-tabular">{formatCurrency(totalAvailable, currency)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#176B52] dark:text-[#82D9B4]">
                <span>Committed Savings Target</span>
                <span className="font-bold font-tabular">−{formatCurrency(savingsTarget, currency)}</span>
              </div>
              <div className="pt-2 border-t border-[#176B52]/20 dark:border-[#82D9B4]/20 flex items-center justify-between text-sm font-bold text-[#1A1C1A] dark:text-[#E3E5E1]">
                <span>Available to Spend</span>
                <span className="text-xl font-extrabold text-[#176B52] dark:text-[#82D9B4] font-tabular">
                  {formatCurrency(spendableBudget, currency)}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 h-13 rounded-2xl border border-[#DDE2DD] dark:border-[#414842] text-xs font-semibold text-[#6E736F] dark:text-[#C1C7C0]"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-1 h-13 rounded-2xl bg-[#176B52] hover:bg-[#125843] dark:bg-[#82D9B4] dark:hover:bg-[#6ec29e] text-white dark:text-[#121412] font-bold text-sm shadow-md flex items-center justify-center space-x-2 cursor-pointer active:scale-98"
              >
                <span>Allocate 4 Categories</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: 4 Category Allocation */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs bg-[#F7F8F7] dark:bg-[#252925] p-3 rounded-xl border border-[#DDE2DD] dark:border-[#414842]">
              <div>
                <span className="text-[#6E736F] dark:text-[#C1C7C0]">Spendable: </span>
                <strong className="text-[#1A1C1A] dark:text-[#E3E5E1] font-tabular">{formatCurrency(spendableBudget, currency)}</strong>
              </div>
              <div>
                <span className="text-[#6E736F] dark:text-[#C1C7C0]">Allocated: </span>
                <strong className={`font-tabular ${categoryAllocationDiff === 0 ? 'text-[#176B52] dark:text-[#82D9B4]' : categoryAllocationDiff > 0 ? 'text-amber-600' : 'text-rose-600'}`}>
                  {formatCurrency(totalAllocatedToCategories, currency)}
                </strong>
              </div>
            </div>

            {/* Presets */}
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => applyPreset({ survival: 0.55, optional: 0.20, culture: 0.15, extra: 0.10 })}
                className="flex-1 py-1.5 px-2 text-[11px] font-bold rounded-lg border border-[#DDE2DD] dark:border-[#414842] bg-[#EEF1EE] dark:bg-[#2B312B] text-[#1A1C1A] dark:text-[#E3E5E1]"
              >
                Balanced
              </button>
              <button
                type="button"
                onClick={() => applyPreset({ survival: 0.65, optional: 0.15, culture: 0.10, extra: 0.10 })}
                className="flex-1 py-1.5 px-2 text-[11px] font-bold rounded-lg border border-[#DDE2DD] dark:border-[#414842] bg-[#EEF1EE] dark:bg-[#2B312B] text-[#1A1C1A] dark:text-[#E3E5E1]"
              >
                Essential-Heavy
              </button>
              <button
                type="button"
                onClick={() => applyPreset({ survival: 0.45, optional: 0.30, culture: 0.15, extra: 0.10 })}
                className="flex-1 py-1.5 px-2 text-[11px] font-bold rounded-lg border border-[#DDE2DD] dark:border-[#414842] bg-[#EEF1EE] dark:bg-[#2B312B] text-[#1A1C1A] dark:text-[#E3E5E1]"
              >
                Lifestyle
              </button>
            </div>

            {/* 4 Category Inputs */}
            <div className="space-y-3">
              {(Object.keys(CATEGORIES) as Category[]).map(catKey => {
                const catInfo = CATEGORIES[catKey];
                const val = catBudgets[catKey] || 0;
                const percentage = spendableBudget > 0 ? Math.round((val / spendableBudget) * 100) : 0;
                return (
                  <div 
                    key={catKey}
                    className="p-3 rounded-2xl border border-[#DDE2DD] dark:border-[#414842] bg-[#F7F8F7] dark:bg-[#252925] space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{catInfo.icon}</span>
                        <div>
                          <span className="text-xs font-bold text-[#1A1C1A] dark:text-[#E3E5E1] block">
                            {catInfo.name}
                          </span>
                          <span className="text-[10px] text-[#6E736F] dark:text-[#C1C7C0]">
                            {catInfo.description}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-[#6E736F] dark:text-[#C1C7C0]">
                        {percentage}%
                      </span>
                    </div>

                    <div className="flex items-center px-3 h-11 rounded-xl bg-white dark:bg-[#1B1E1B] border border-[#DDE2DD] dark:border-[#414842]">
                      <span className="text-sm font-bold text-[#6E736F] mr-1.5">{currencySymbol}</span>
                      <input
                        type="number"
                        value={val}
                        onChange={(e) => {
                          const num = parseFloat(e.target.value) || 0;
                          setCatBudgets(prev => ({ ...prev, [catKey]: num }));
                        }}
                        className="w-full text-base font-bold bg-transparent outline-none font-tabular text-[#1A1C1A] dark:text-[#E3E5E1]"
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
                className="px-4 h-13 rounded-2xl border border-[#DDE2DD] dark:border-[#414842] text-xs font-semibold text-[#6E736F] dark:text-[#C1C7C0]"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setStep(4)}
                className="flex-1 h-13 rounded-2xl bg-[#176B52] hover:bg-[#125843] dark:bg-[#82D9B4] dark:hover:bg-[#6ec29e] text-white dark:text-[#121412] font-bold text-sm shadow-md flex items-center justify-center space-x-2 cursor-pointer active:scale-98"
              >
                <span>Next: Plan Sectors</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Planned Expense Sectors */}
        {step === 4 && (
          <div className="space-y-4">
            {/* Category Tabs */}
            <div className="flex space-x-1.5 overflow-x-auto pb-1 no-scrollbar">
              {(Object.keys(CATEGORIES) as Category[]).map(catKey => {
                const info = CATEGORIES[catKey];
                const isSelected = activeSectorTab === catKey;
                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => setActiveSectorTab(catKey)}
                    className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors border ${
                      isSelected
                        ? 'bg-[#176B52] text-white border-[#176B52] dark:bg-[#82D9B4] dark:text-[#121412]'
                        : 'bg-[#F7F8F7] dark:bg-[#252925] text-[#6E736F] dark:text-[#C1C7C0] border-[#DDE2DD] dark:border-[#414842]'
                    }`}
                  >
                    <span>{info.icon}</span>
                    <span>{info.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Header info for selected category */}
            <div className="p-3 rounded-xl bg-[#F7F8F7] dark:bg-[#252925] border border-[#DDE2DD] dark:border-[#414842] flex items-center justify-between text-xs">
              <div>
                <span className="text-[#6E736F] dark:text-[#C1C7C0] block">{CATEGORIES[activeSectorTab].name} Target</span>
                <strong className="text-[#1A1C1A] dark:text-[#E3E5E1] font-tabular">
                  {formatCurrency(catBudgets[activeSectorTab] || 0, currency)}
                </strong>
              </div>
              <div className="text-right">
                <span className="text-[#6E736F] dark:text-[#C1C7C0] block">Sectors Total</span>
                <strong className="text-[#176B52] dark:text-[#82D9B4] font-tabular">
                  {formatCurrency((sectors[activeSectorTab] || []).reduce((s, i) => s + i.plannedAmount, 0), currency)}
                </strong>
              </div>
            </div>

            {/* List of Sectors */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {(sectors[activeSectorTab] || []).map(sec => (
                <div 
                  key={sec.id}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-[#DDE2DD] dark:border-[#414842] bg-white dark:bg-[#1B1E1B]"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-base">{sec.icon || '📌'}</span>
                    <span className="text-xs font-bold text-[#1A1C1A] dark:text-[#E3E5E1]">{sec.name}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="flex items-center px-2 h-8 rounded-lg bg-[#F7F8F7] dark:bg-[#252925] border border-[#DDE2DD] dark:border-[#414842] w-24">
                      <span className="text-[11px] font-bold text-[#6E736F] mr-1">{currencySymbol}</span>
                      <input
                        type="number"
                        value={sec.plannedAmount}
                        onChange={(e) => handleUpdateSectorAmount(activeSectorTab, sec.id, parseFloat(e.target.value) || 0)}
                        className="w-full text-xs font-bold bg-transparent outline-none font-tabular text-[#1A1C1A] dark:text-[#E3E5E1]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveSector(activeSectorTab, sec.id)}
                      className="p-1 rounded text-[#9AA0A6] hover:text-rose-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {(sectors[activeSectorTab] || []).length === 0 && (
                <div className="text-center py-6 text-xs text-[#6E736F] dark:text-[#C1C7C0]">
                  No planned sectors added for {CATEGORIES[activeSectorTab].name}.
                </div>
              )}
            </div>

            {/* Add Custom Sector */}
            <div className="flex items-center space-x-2 pt-1">
              <input
                type="text"
                value={newSectorName}
                onChange={(e) => setNewSectorName(e.target.value)}
                placeholder="New sector (e.g. WiFi, Books)"
                className="flex-1 h-10 px-3 text-xs rounded-xl border border-[#DDE2DD] dark:border-[#414842] bg-[#F7F8F7] dark:bg-[#252925] text-[#1A1C1A] dark:text-[#E3E5E1] outline-none"
              />
              <input
                type="number"
                value={newSectorAmount}
                onChange={(e) => setNewSectorAmount(e.target.value)}
                placeholder="Amount"
                className="w-20 h-10 px-2 text-xs font-tabular rounded-xl border border-[#DDE2DD] dark:border-[#414842] bg-[#F7F8F7] dark:bg-[#252925] text-[#1A1C1A] dark:text-[#E3E5E1] outline-none"
              />
              <button
                type="button"
                onClick={() => handleAddCustomSector(activeSectorTab)}
                className="h-10 px-3 rounded-xl bg-[#176B52] dark:bg-[#82D9B4] text-white dark:text-[#121412] text-xs font-bold flex items-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-4 h-13 rounded-2xl border border-[#DDE2DD] dark:border-[#414842] text-xs font-semibold text-[#6E736F] dark:text-[#C1C7C0]"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setStep(5)}
                className="flex-1 h-13 rounded-2xl bg-[#176B52] hover:bg-[#125843] dark:bg-[#82D9B4] dark:hover:bg-[#6ec29e] text-white dark:text-[#121412] font-bold text-sm shadow-md flex items-center justify-center space-x-2 cursor-pointer active:scale-98"
              >
                <span>Next: Review & Confirm</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Review & Intentions */}
        {step === 5 && (
          <div className="space-y-4">
            {/* Blueprint Summary Card */}
            <div className="p-4 rounded-2xl bg-[#F7F8F7] dark:bg-[#252925] border border-[#DDE2DD] dark:border-[#414842] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#DDE2DD] dark:border-[#414842]">
                <span className="text-xs text-[#6E736F] dark:text-[#C1C7C0]">Total Available</span>
                <strong className="text-sm font-bold font-tabular text-[#1A1C1A] dark:text-[#E3E5E1]">
                  {formatCurrency(totalAvailable, currency)}
                </strong>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-[#DDE2DD] dark:border-[#414842]">
                <span className="text-xs text-[#176B52] dark:text-[#82D9B4] font-medium">Committed Savings</span>
                <strong className="text-sm font-bold font-tabular text-[#176B52] dark:text-[#82D9B4]">
                  {formatCurrency(savingsTarget, currency)}
                </strong>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-[#DDE2DD] dark:border-[#414842]">
                <span className="text-xs font-bold text-[#1A1C1A] dark:text-[#E3E5E1]">Total Spending Budget</span>
                <strong className="text-base font-extrabold font-tabular text-[#176B52] dark:text-[#82D9B4]">
                  {formatCurrency(spendableBudget, currency)}
                </strong>
              </div>

              {/* 4 Pillars Mini Breakdown */}
              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                <div className="p-2 rounded-xl bg-white dark:bg-[#1B1E1B] border border-[#DDE2DD] dark:border-[#414842]">
                  <span className="text-[#6E736F] dark:text-[#C1C7C0] block">🏠 Essentials</span>
                  <span className="font-bold font-tabular text-[#1A1C1A] dark:text-[#E3E5E1]">{formatCurrency(catBudgets.survival, currency)}</span>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-[#1B1E1B] border border-[#DDE2DD] dark:border-[#414842]">
                  <span className="text-[#6E736F] dark:text-[#C1C7C0] block">🛍️ Wants</span>
                  <span className="font-bold font-tabular text-[#1A1C1A] dark:text-[#E3E5E1]">{formatCurrency(catBudgets.optional, currency)}</span>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-[#1B1E1B] border border-[#DDE2DD] dark:border-[#414842]">
                  <span className="text-[#6E736F] dark:text-[#C1C7C0] block">📚 Culture / Growth</span>
                  <span className="font-bold font-tabular text-[#1A1C1A] dark:text-[#E3E5E1]">{formatCurrency(catBudgets.culture, currency)}</span>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-[#1B1E1B] border border-[#DDE2DD] dark:border-[#414842]">
                  <span className="text-[#6E736F] dark:text-[#C1C7C0] block">⚡ Extra</span>
                  <span className="font-bold font-tabular text-[#1A1C1A] dark:text-[#E3E5E1]">{formatCurrency(catBudgets.extra, currency)}</span>
                </div>
              </div>
            </div>

            {/* Mindful Habit Question (Kakeibo core question 4) */}
            <div>
              <label className="block text-xs font-bold text-[#1A1C1A] dark:text-[#E3E5E1] mb-1.5 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#176B52] dark:text-[#82D9B4]" />
                <span>One financial habit to improve this month</span>
              </label>
              <textarea
                value={improvementNote}
                onChange={(e) => setImprovementNote(e.target.value)}
                placeholder="e.g. Cook home meals, pause 24h before non-essential purchases..."
                rows={2}
                className="w-full p-3 rounded-2xl border border-[#DDE2DD] dark:border-[#414842] bg-[#F7F8F7] dark:bg-[#252925] text-xs text-[#1A1C1A] dark:text-[#E3E5E1] outline-none resize-none"
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(4)}
                className="px-4 h-13 rounded-2xl border border-[#DDE2DD] dark:border-[#414842] text-xs font-semibold text-[#6E736F] dark:text-[#C1C7C0]"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleFinish}
                className="flex-1 h-13 rounded-2xl bg-[#176B52] hover:bg-[#125843] dark:bg-[#82D9B4] dark:hover:bg-[#6ec29e] text-white dark:text-[#121412] font-bold text-sm shadow-md flex items-center justify-center space-x-2 cursor-pointer active:scale-98"
              >
                <Check className="w-4 h-4" />
                <span>Save Monthly Plan</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
