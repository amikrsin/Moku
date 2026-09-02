import React, { useState, useEffect } from 'react';
import { 
  Category, 
  CategoryBudgets, 
  BudgetLine, 
  Plan, 
  SUPPORTED_CURRENCIES 
} from '../types';
import { formatCurrency, formatMonthName, getGlobalCurrency, generateUUID } from '../lib/storage';
import { getT, getCategoriesForCurrency } from '../lib/i18n';
import { 
  Sparkles, 
  RefreshCw, 
  Check, 
  ArrowRight, 
  Plus, 
  Trash2, 
  Layers, 
  Copy, 
  History, 
  RotateCcw,
  CheckCircle2,
  Calendar
} from 'lucide-react';

interface MonthlySetupViewProps {
  monthKey: string;
  existingPlan?: Plan | null;
  allPlans?: Plan[];
  initialCopySourcePlan?: Plan | null;
  currency?: string;
  onSavePlan: (plan: Plan) => void;
  onDone?: () => void;
}

export const MonthlySetupView: React.FC<MonthlySetupViewProps> = ({
  monthKey,
  existingPlan,
  allPlans = [],
  initialCopySourcePlan,
  currency = getGlobalCurrency(),
  onSavePlan,
  onDone,
}) => {
  const t = getT(currency);
  const categories = getCategoriesForCurrency(currency);

  const defaultNotes = 'Cook wholesome meals at home and avoid impulsive non-essential purchases.';

  // Initial source can be existing plan or initial copy plan
  const basePlan = existingPlan || initialCopySourcePlan;

  const [income, setIncome] = useState<string>(basePlan?.income ? String(basePlan.income) : '50000');
  const [savingsTarget, setSavingsTarget] = useState<string>(basePlan?.savingsTarget ? String(basePlan.savingsTarget) : '15000');
  const [totalExpenses, setTotalExpenses] = useState<string>(basePlan?.totalExpenses ? String(basePlan.totalExpenses) : '35000');
  const [improvementNotes, setImprovementNotes] = useState<string>(
    basePlan?.improvementNotes || defaultNotes
  );

  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudgets>(
    basePlan?.categoryBudgets || {
      survival: 18000,
      optional: 7000,
      culture: 5000,
      extra: 5000,
    }
  );

  const [categoryBudgetLines, setCategoryBudgetLines] = useState<{
    survival: BudgetLine[];
    optional: BudgetLine[];
    culture: BudgetLine[];
    extra: BudgetLine[];
  }>(() => ({
    survival: basePlan?.categoryBudgetLines?.survival 
      ? basePlan.categoryBudgetLines.survival.map(l => ({ ...l, id: generateUUID() })) 
      : [],
    optional: basePlan?.categoryBudgetLines?.optional 
      ? basePlan.categoryBudgetLines.optional.map(l => ({ ...l, id: generateUUID() })) 
      : [],
    culture: basePlan?.categoryBudgetLines?.culture 
      ? basePlan.categoryBudgetLines.culture.map(l => ({ ...l, id: generateUUID() })) 
      : [],
    extra: basePlan?.categoryBudgetLines?.extra 
      ? basePlan.categoryBudgetLines.extra.map(l => ({ ...l, id: generateUUID() })) 
      : [],
  }));

  const [hasSaved, setHasSaved] = useState(false);
  const [copyNotification, setCopyNotification] = useState<string | null>(
    initialCopySourcePlan 
      ? `Copied budget plan from ${formatMonthName(initialCopySourcePlan.monthKey)}. You can now make any minor adjustments below before saving.`
      : null
  );
  const [snapshotBeforeCopy, setSnapshotBeforeCopy] = useState<{
    income: string;
    savingsTarget: string;
    totalExpenses: string;
    improvementNotes: string;
    categoryBudgets: CategoryBudgets;
    categoryBudgetLines: {
      survival: BudgetLine[];
      optional: BudgetLine[];
      culture: BudgetLine[];
      extra: BudgetLine[];
    };
  } | null>(null);

  // Available past or future plans to copy from
  const otherPlans = allPlans
    .filter((p) => p.monthKey !== monthKey)
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey));

  const [selectedCopyMonthKey, setSelectedCopyMonthKey] = useState<string>(() => {
    return otherPlans[0]?.monthKey || '';
  });

  const selectedCopyPlan = otherPlans.find((p) => p.monthKey === selectedCopyMonthKey) || otherPlans[0];

  const handleCopyPlan = (sourcePlan: Plan) => {
    // Snapshot current state for undo
    setSnapshotBeforeCopy({
      income,
      savingsTarget,
      totalExpenses,
      improvementNotes,
      categoryBudgets,
      categoryBudgetLines,
    });

    setIncome(String(sourcePlan.income));
    setSavingsTarget(String(sourcePlan.savingsTarget));
    setTotalExpenses(String(sourcePlan.totalExpenses));
    setImprovementNotes(sourcePlan.improvementNotes || defaultNotes);
    setCategoryBudgets({ ...sourcePlan.categoryBudgets });
    
    // Deep clone budget lines with fresh unique IDs
    setCategoryBudgetLines({
      survival: (sourcePlan.categoryBudgetLines?.survival || []).map(l => ({ ...l, id: generateUUID() })),
      optional: (sourcePlan.categoryBudgetLines?.optional || []).map(l => ({ ...l, id: generateUUID() })),
      culture: (sourcePlan.categoryBudgetLines?.culture || []).map(l => ({ ...l, id: generateUUID() })),
      extra: (sourcePlan.categoryBudgetLines?.extra || []).map(l => ({ ...l, id: generateUUID() })),
    });

    setCopyNotification(`Plan copied from ${formatMonthName(sourcePlan.monthKey)}! You can now make any slight adjustments below.`);
  };

  const handleUndoCopy = () => {
    if (snapshotBeforeCopy) {
      setIncome(snapshotBeforeCopy.income);
      setSavingsTarget(snapshotBeforeCopy.savingsTarget);
      setTotalExpenses(snapshotBeforeCopy.totalExpenses);
      setImprovementNotes(snapshotBeforeCopy.improvementNotes);
      setCategoryBudgets(snapshotBeforeCopy.categoryBudgets);
      setCategoryBudgetLines(snapshotBeforeCopy.categoryBudgetLines);
      setSnapshotBeforeCopy(null);
      setCopyNotification(null);
    }
  };

  // Auto-split evenly across flat budgets
  const handleSplitEvenly = () => {
    const total = parseFloat(totalExpenses) || 0;
    const quarter = Math.round(total / 4);
    
    // Clear lines or reset flat
    setCategoryBudgets({
      survival: quarter,
      optional: quarter,
      culture: quarter,
      extra: total - quarter * 3, // balance remainder
    });
  };

  const handleIncomeChange = (val: string) => {
    setIncome(val);
    const incNum = parseFloat(val) || 0;
    const savNum = parseFloat(savingsTarget) || 0;
    const deductedSpend = Math.max(0, incNum - savNum);
    setTotalExpenses(String(deductedSpend));
  };

  const handleSavingsChange = (val: string) => {
    setSavingsTarget(val);
    const incNum = parseFloat(income) || 0;
    const savNum = parseFloat(val) || 0;
    const deductedSpend = Math.max(0, incNum - savNum);
    setTotalExpenses(String(deductedSpend));
  };

  const handleTotalExpensesChange = (val: string) => {
    setTotalExpenses(val);
    const incNum = parseFloat(income) || 0;
    const expNum = parseFloat(val) || 0;
    if (incNum >= expNum) {
      const derivedSavings = Math.max(0, incNum - expNum);
      setSavingsTarget(String(derivedSavings));
    }
  };

  const handleRecalculateDeduction = () => {
    const incNum = parseFloat(income) || 0;
    const savNum = parseFloat(savingsTarget) || 0;
    const deductedSpend = Math.max(0, incNum - savNum);
    setTotalExpenses(String(deductedSpend));
  };

  const handleCategoryFlatChange = (cat: Category, val: string) => {
    const num = parseFloat(val) || 0;
    setCategoryBudgets((prev) => ({
      ...prev,
      [cat]: num,
    }));
  };

  // Sub-category budget line handlers
  const handleAddLine = (cat: Category) => {
    const defaultNames: Record<Category, string> = {
      survival: 'Rent / Groceries',
      optional: 'Dining / Coffee',
      culture: 'Books / Lessons',
      extra: 'Repairs / Gifts',
    };

    const newLine: BudgetLine = {
      id: generateUUID(),
      name: defaultNames[cat],
      budget: 0,
    };

    setCategoryBudgetLines((prev) => {
      const updatedLines = [...(prev[cat] || []), newLine];
      const sum = updatedLines.reduce((acc, l) => acc + (l.budget || 0), 0);
      setCategoryBudgets((b) => ({ ...b, [cat]: sum }));
      return { ...prev, [cat]: updatedLines };
    });
  };

  const handleUpdateLine = (cat: Category, index: number, field: 'name' | 'budget', val: string | number) => {
    setCategoryBudgetLines((prev) => {
      const list = [...(prev[cat] || [])];
      if (!list[index]) return prev;
      
      if (field === 'name') {
        list[index] = { ...list[index], name: String(val) };
      } else {
        const num = typeof val === 'number' ? val : (parseFloat(val) || 0);
        list[index] = { ...list[index], budget: num };
      }

      // Recompute category sum from lines
      const sum = list.reduce((acc, l) => acc + (l.budget || 0), 0);
      setCategoryBudgets((b) => ({ ...b, [cat]: sum }));

      return { ...prev, [cat]: list };
    });
  };

  const handleRemoveLine = (cat: Category, index: number) => {
    setCategoryBudgetLines((prev) => {
      const list = [...(prev[cat] || [])];
      list.splice(index, 1);
      
      if (list.length > 0) {
        const sum = list.reduce((acc, l) => acc + (l.budget || 0), 0);
        setCategoryBudgets((b) => ({ ...b, [cat]: sum }));
      }
      return { ...prev, [cat]: list };
    });
  };

  // Sum of categories (either derived from lines or flat)
  const getCategoryAmount = (cat: Category) => {
    const lines = categoryBudgetLines[cat];
    if (lines && lines.length > 0) {
      return lines.reduce((acc, l) => acc + (l.budget || 0), 0);
    }
    return categoryBudgets[cat] ?? 0;
  };

  const allocatedSum = 
    getCategoryAmount('survival') +
    getCategoryAmount('optional') +
    getCategoryAmount('culture') +
    getCategoryAmount('extra');

  const plannedTotalNum = parseFloat(totalExpenses) || 0;
  const difference = allocatedSum - plannedTotalNum;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const incNum = parseFloat(income) || 0;
    const savNum = parseFloat(savingsTarget) || 0;
    const expNum = parseFloat(totalExpenses) || 0;

    // Final reconciled category budgets
    const finalCategoryBudgets: CategoryBudgets = {
      survival: getCategoryAmount('survival'),
      optional: getCategoryAmount('optional'),
      culture: getCategoryAmount('culture'),
      extra: getCategoryAmount('extra'),
    };

    const newPlan: Plan = {
      monthKey,
      income: incNum,
      savingsTarget: savNum,
      totalExpenses: expNum,
      improvementNotes: improvementNotes.trim(),
      categoryBudgets: finalCategoryBudgets,
      categoryBudgetLines: {
        survival: categoryBudgetLines.survival.filter((l) => l.name.trim()),
        optional: categoryBudgetLines.optional.filter((l) => l.name.trim()),
        culture: categoryBudgetLines.culture.filter((l) => l.name.trim()),
        extra: categoryBudgetLines.extra.filter((l) => l.name.trim()),
      },
      currency,
      reflection: existingPlan?.reflection || '',
      updatedAt: Date.now(),
    };

    onSavePlan(newPlan);
    setHasSaved(true);
    setTimeout(() => {
      setHasSaved(false);
      if (onDone) onDone();
    }, 900);
  };

  const currencySymbol = SUPPORTED_CURRENCIES.find((c) => c.code === currency)?.symbol || '₹';

  return (
    <div className="max-w-2xl mx-auto py-2">
      {/* Page Header */}
      <div className="border-b border-[#565248]/20 pb-4 mb-6">
        <div>
          <span className="text-xs font-serif tracking-wider text-[#A8342A] uppercase font-bold inline-block">
            {t.setupHeaderSubtitle}
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#23211D] mt-0.5 tracking-tight">
            {formatMonthName(monthKey)} {t.setupHeaderTitle}
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-[#565248] mt-2 leading-relaxed">
          In Kakeibo, mindfulness begins before any money is spent. Answer the four classical questions to set a deliberate, peaceful tone for the month.
        </p>
      </div>

      {/* Copy Previous Month Budget Plan Section */}
      {otherPlans.length > 0 && (
        <div className="mb-6 p-4 rounded-lg bg-[#E5DFCE]/80 border border-[#565248]/25 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-md bg-[#A8342A]/10 border border-[#A8342A]/30 flex items-center justify-center text-[#A8342A] shrink-0 mt-0.5">
                <Copy className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-serif text-sm font-bold text-[#23211D] flex items-center space-x-2">
                  <span>Save time: Copy previous month plan</span>
                </h3>
                <p className="text-xs text-[#565248] mt-0.5">
                  Import your previous income, savings target, and sub-category lines, then tweak what has changed.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
              {otherPlans.length > 1 && (
                <select
                  id="select-copy-source-month"
                  value={selectedCopyMonthKey}
                  onChange={(e) => setSelectedCopyMonthKey(e.target.value)}
                  className="bg-[#EDE8DA] border border-[#565248]/30 rounded-md px-2.5 py-1.5 text-xs text-[#23211D] font-medium focus:outline-hidden focus:border-[#A8342A] cursor-pointer"
                >
                  {otherPlans.map((p) => (
                    <option key={p.monthKey} value={p.monthKey}>
                      {formatMonthName(p.monthKey)}
                    </option>
                  ))}
                </select>
              )}

              <button
                id="copy-previous-plan-btn"
                type="button"
                onClick={() => selectedCopyPlan && handleCopyPlan(selectedCopyPlan)}
                className="inline-flex items-center space-x-1.5 bg-[#A8342A] hover:bg-[#8F2B22] text-[#EDE8DA] text-xs font-serif font-bold px-3.5 py-1.5 rounded-md shadow-2xs transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>
                  Copy {selectedCopyPlan ? formatMonthName(selectedCopyPlan.monthKey) : 'Plan'}
                </span>
              </button>
            </div>
          </div>

          {/* Source Plan Quick Preview Pills */}
          {selectedCopyPlan && (
            <div className="mt-3 pt-2.5 border-t border-[#565248]/15 flex items-center flex-wrap gap-2 text-[11px] text-[#565248]">
              <span className="font-medium text-[#23211D]">Included in {formatMonthName(selectedCopyPlan.monthKey)}:</span>
              <span className="bg-[#EDE8DA] px-2 py-0.5 rounded-xs border border-[#565248]/15 font-tabular">
                Income: <strong>{formatCurrency(selectedCopyPlan.income, currency)}</strong>
              </span>
              <span className="bg-[#EDE8DA] px-2 py-0.5 rounded-xs border border-[#565248]/15 font-tabular text-[#5C6E4E]">
                Savings: <strong>{formatCurrency(selectedCopyPlan.savingsTarget, currency)}</strong>
              </span>
              <span className="bg-[#EDE8DA] px-2 py-0.5 rounded-xs border border-[#565248]/15 font-tabular text-[#B5652E]">
                Outlays: <strong>{formatCurrency(selectedCopyPlan.totalExpenses, currency)}</strong>
              </span>
              {selectedCopyPlan.categoryBudgetLines && (
                <span className="bg-[#EDE8DA] px-2 py-0.5 rounded-xs border border-[#565248]/15">
                  <strong>
                    {(selectedCopyPlan.categoryBudgetLines.survival?.length || 0) +
                     (selectedCopyPlan.categoryBudgetLines.optional?.length || 0) +
                     (selectedCopyPlan.categoryBudgetLines.culture?.length || 0) +
                     (selectedCopyPlan.categoryBudgetLines.extra?.length || 0)}
                  </strong> custom budget lines
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Copy Success Feedback & Undo Notification */}
      {copyNotification && (
        <div className="mb-5 p-3 rounded-lg bg-[#5C6E4E]/10 border border-[#5C6E4E]/30 flex items-center justify-between gap-2 text-xs text-[#23211D] animate-fadeIn">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-[#5C6E4E] shrink-0" />
            <span>{copyNotification}</span>
          </div>
          {snapshotBeforeCopy && (
            <button
              type="button"
              onClick={handleUndoCopy}
              className="inline-flex items-center space-x-1 text-[#A8342A] hover:underline font-medium shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Undo</span>
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* The Four Questions */}
        <div className="space-y-5 bg-[#E5DFCE]/60 border border-[#565248]/20 rounded-lg p-4 sm:p-6 shadow-2xs">
          
          {/* Question 1 */}
          <div>
            <div className="flex items-baseline justify-between mb-1.5 flex-wrap gap-1">
              <label htmlFor="q1-income" className="font-serif text-sm sm:text-base font-bold text-[#23211D] flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-[#35415C] text-[#EDE8DA] text-xs flex items-center justify-center font-sans font-semibold">1</span>
                <span>{t.setupQ1Title}</span>
              </label>
              <span className="text-xs text-[#565248]">{t.setupQ1Sub}</span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-serif text-[#565248]">
                {currencySymbol}
              </span>
              <input
                id="q1-income"
                type="number"
                step="any"
                min="0"
                required
                value={income}
                onChange={(e) => handleIncomeChange(e.target.value)}
                placeholder="e.g. 50000"
                className="w-full bg-[#EDE8DA] border border-[#565248]/30 rounded-md pl-8 pr-3 py-2 text-[#23211D] font-tabular text-base sm:text-lg focus:outline-hidden focus:border-[#35415C] focus:ring-1 focus:ring-[#35415C]"
              />
            </div>
          </div>

          {/* Question 2 */}
          <div>
            <div className="flex items-baseline justify-between mb-1.5 flex-wrap gap-1">
              <label htmlFor="q2-savings" className="font-serif text-sm sm:text-base font-bold text-[#23211D] flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-[#5C6E4E] text-[#EDE8DA] text-xs flex items-center justify-center font-sans font-semibold">2</span>
                <span>{t.setupQ2Title}</span>
              </label>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-[#5C6E4E] bg-[#5C6E4E]/15 border border-[#5C6E4E]/30 px-2 py-0.5 rounded-full font-tabular">
                  {(parseFloat(income) || 0) > 0 
                    ? `${(((parseFloat(savingsTarget) || 0) / (parseFloat(income) || 0)) * 100).toFixed(1)}% of income`
                    : '0% of income'}
                </span>
                <span className="text-xs text-[#5C6E4E] font-medium hidden sm:inline">{t.setupQ2Sub}</span>
              </div>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-serif text-[#565248]">
                {currencySymbol}
              </span>
              <input
                id="q2-savings"
                type="number"
                step="any"
                min="0"
                required
                value={savingsTarget}
                onChange={(e) => handleSavingsChange(e.target.value)}
                placeholder="e.g. 15000"
                className="w-full bg-[#EDE8DA] border border-[#565248]/30 rounded-md pl-8 pr-3 py-2 text-[#23211D] font-tabular text-base sm:text-lg focus:outline-hidden focus:border-[#5C6E4E] focus:ring-1 focus:ring-[#5C6E4E]"
              />
            </div>
            {(parseFloat(income) || 0) > 0 && (
              <div className="text-[11px] text-[#565248] mt-1 flex items-center justify-between">
                <span>
                  Targeting to preserve <strong className="text-[#5C6E4E] font-tabular">{(((parseFloat(savingsTarget) || 0) / (parseFloat(income) || 0)) * 100).toFixed(1)}%</strong> of your total available monthly income.
                </span>
              </div>
            )}
          </div>

          {/* Question 3 */}
          <div>
            <div className="flex items-baseline justify-between mb-1.5 flex-wrap gap-1">
              <label htmlFor="q3-expenses" className="font-serif text-sm sm:text-base font-bold text-[#23211D] flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-[#B5652E] text-[#EDE8DA] text-xs flex items-center justify-center font-sans font-semibold">3</span>
                <span>{t.setupQ3Title}</span>
              </label>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-[#B5652E] bg-[#B5652E]/15 border border-[#B5652E]/30 px-2 py-0.5 rounded-full font-tabular">
                  {(parseFloat(income) || 0) > 0 
                    ? `${(((parseFloat(totalExpenses) || 0) / (parseFloat(income) || 0)) * 100).toFixed(1)}% of income`
                    : '0% of income'}
                </span>
                <span className="text-xs text-[#565248] hidden sm:inline">{t.setupQ3Sub}</span>
              </div>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-serif text-[#565248]">
                {currencySymbol}
              </span>
              <input
                id="q3-expenses"
                type="number"
                step="any"
                min="0"
                required
                value={totalExpenses}
                onChange={(e) => handleTotalExpensesChange(e.target.value)}
                placeholder="e.g. 35000"
                className="w-full bg-[#EDE8DA] border border-[#565248]/30 rounded-md pl-8 pr-3 py-2 text-[#23211D] font-tabular text-base sm:text-lg focus:outline-hidden focus:border-[#B5652E] focus:ring-1 focus:ring-[#B5652E]"
              />
            </div>

            {/* Live Deduction Formula Card */}
            <div className="mt-2 p-2.5 rounded-md bg-[#EDE8DA] border border-[#565248]/20 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
              <div className="flex items-center space-x-1.5 flex-wrap text-[#565248]">
                <span className="font-semibold text-[#23211D]">Deducted outlays:</span>
                <span className="bg-[#E5DFCE] px-1.5 py-0.5 rounded-xs font-tabular text-[#35415C]">
                  Income 100% ({formatCurrency(parseFloat(income) || 0, currency)})
                </span>
                <span>−</span>
                <span className="bg-[#E5DFCE] px-1.5 py-0.5 rounded-xs font-tabular text-[#5C6E4E]">
                  Savings {(parseFloat(income) || 0) > 0 ? `${(((parseFloat(savingsTarget) || 0) / (parseFloat(income) || 0)) * 100).toFixed(1)}%` : '0%'} ({formatCurrency(parseFloat(savingsTarget) || 0, currency)})
                </span>
                <span>=</span>
                <strong className="font-serif font-bold text-[#B5652E] font-tabular text-xs sm:text-sm">
                  {(parseFloat(income) || 0) > 0 ? `${(((Math.max(0, (parseFloat(income) || 0) - (parseFloat(savingsTarget) || 0))) / (parseFloat(income) || 0)) * 100).toFixed(1)}%` : '0%'} ({formatCurrency(Math.max(0, (parseFloat(income) || 0) - (parseFloat(savingsTarget) || 0)), currency)}) to spend
                </strong>
              </div>

              <button
                type="button"
                onClick={handleRecalculateDeduction}
                className="text-[11px] text-[#A8342A] hover:underline font-serif font-medium whitespace-nowrap self-start sm:self-auto cursor-pointer"
              >
                ↺ Sync Deduction
              </button>
            </div>

            {(parseFloat(savingsTarget) || 0) > (parseFloat(income) || 0) && (
              <p className="text-xs text-[#A8342A] mt-1.5 font-medium">
                ⚠️ Target savings exceeds total available income.
              </p>
            )}
          </div>

          {/* Question 4 */}
          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <label htmlFor="q4-improve" className="font-serif text-sm sm:text-base font-bold text-[#23211D] flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-[#A8342A] text-[#EDE8DA] text-xs flex items-center justify-center font-sans font-semibold">4</span>
                <span>{t.setupQ4Title}</span>
              </label>
              <span className="text-xs text-[#A8342A]">{t.setupQ4Sub}</span>
            </div>
            <textarea
              id="q4-improve"
              rows={2}
              value={improvementNotes}
              onChange={(e) => setImprovementNotes(e.target.value)}
              placeholder={t.setupQ4Placeholder}
              className="w-full bg-[#EDE8DA] border border-[#565248]/30 rounded-md p-3 text-[#23211D] text-sm focus:outline-hidden focus:border-[#A8342A] focus:ring-1 focus:ring-[#A8342A] placeholder:text-[#565248]/50"
            />
          </div>

        </div>

        {/* Category Budget Allocation & Sub-Category Budget Lines */}
        <div className="bg-[#E5DFCE]/60 border border-[#565248]/20 rounded-lg p-4 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#565248]/15 pb-3">
            <div>
              <h3 className="font-serif text-base font-bold text-[#23211D] flex items-center space-x-1.5">
                <Layers className="w-4 h-4 text-[#A8342A]" />
                <span>{t.setupCategorySplitTitle}</span>
              </h3>
              <p className="text-xs text-[#565248] mt-0.5">
                Distribute your {formatCurrency(plannedTotalNum, currency)} planned expenses across the 4 pillars or add specific budget lines.
              </p>
            </div>
            
            <button
              id="split-evenly-btn"
              type="button"
              onClick={handleSplitEvenly}
              className="inline-flex items-center space-x-1.5 text-xs bg-[#EDE8DA] hover:bg-[#DFD8C5] border border-[#565248]/30 px-2.5 py-1.5 rounded-md text-[#23211D] transition-colors self-start sm:self-auto cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#565248]" />
              <span>Split Evenly (25% each)</span>
            </button>
          </div>

          {/* 4 Category Input Cards */}
          <div className="grid grid-cols-1 gap-4 pt-1">
            {(Object.keys(categories) as Category[]).map((catKey) => {
              const cat = categories[catKey];
              const lines = categoryBudgetLines[catKey] || [];
              const hasLines = lines.length > 0;
              const catTotal = getCategoryAmount(catKey);
              const catPctOfSpend = plannedTotalNum > 0 ? ((catTotal / plannedTotalNum) * 100).toFixed(1) : '0';
              const catPctOfIncome = (parseFloat(income) || 0) > 0 ? ((catTotal / (parseFloat(income) || 0)) * 100).toFixed(1) : '0';

              return (
                <div
                  key={catKey}
                  className="bg-[#EDE8DA] border border-[#565248]/25 rounded-md p-3.5 transition-all shadow-2xs"
                  style={{ borderLeftColor: cat.color, borderLeftWidth: '4px' }}
                >
                  {/* Category Header & Total */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span className="font-serif text-sm sm:text-base font-bold text-[#23211D]">
                          {cat.name}
                        </span>
                        <span className="text-[11px] font-semibold text-[#23211D] bg-[#E5DFCE] border border-[#565248]/20 px-2 py-0.5 rounded-full font-tabular">
                          {catPctOfSpend}% of spend
                        </span>
                        {hasLines && (
                          <span className="text-[10px] bg-[#E5DFCE] border border-[#565248]/20 px-1.5 py-0.5 rounded-xs text-[#565248]">
                            {lines.length} lines
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-[#565248]">
                        {cat.subhead} ({catPctOfIncome}% of total income)
                      </span>
                    </div>

                    {/* Category Total Input / Display */}
                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="text-xs font-serif text-[#565248]">
                        {hasLines ? 'Sum of lines:' : 'Budget:'}
                      </span>
                      <div className="relative w-32 sm:w-36">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 font-serif text-xs text-[#565248]">
                          {currencySymbol}
                        </span>
                        <input
                          id={`budget-${catKey}`}
                          type="number"
                          min="0"
                          step="any"
                          readOnly={hasLines}
                          value={catTotal || ''}
                          onChange={(e) => handleCategoryFlatChange(catKey, e.target.value)}
                          placeholder="0"
                          className={`w-full border rounded-xs pl-6 pr-2 py-1 text-sm font-tabular font-bold text-[#23211D] focus:outline-hidden ${
                            hasLines 
                              ? 'bg-[#E5DFCE]/60 border-[#565248]/15 cursor-not-allowed text-[#35415C]' 
                              : 'bg-[#E5DFCE] border-[#565248]/30 focus:border-[#23211D]'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sub-category Budget Lines List */}
                  {hasLines && (
                    <div className="space-y-2 my-2.5 pt-2 border-t border-[#565248]/15">
                      <div className="flex items-center justify-between text-[11px] font-serif text-[#565248] uppercase tracking-wider font-semibold">
                        <span>Named Budget Lines:</span>
                        <span className="text-[10px] font-sans font-normal text-[#565248]">
                          Shows individual share of planned spend & category
                        </span>
                      </div>
                      {lines.map((line, idx) => {
                        const lineBudget = line.budget || 0;
                        const linePctOfSpend = plannedTotalNum > 0 ? ((lineBudget / plannedTotalNum) * 100).toFixed(1) : '0';
                        const linePctOfCat = catTotal > 0 ? ((lineBudget / catTotal) * 100).toFixed(1) : '0';

                        return (
                          <div key={line.id || idx} className="flex flex-col sm:flex-row sm:items-center gap-2 bg-[#E5DFCE]/70 p-2 rounded-md border border-[#565248]/15">
                            <input
                              type="text"
                              value={line.name}
                              onChange={(e) => handleUpdateLine(catKey, idx, 'name', e.target.value)}
                              placeholder="e.g. Rent, Groceries, Dairy"
                              className="flex-1 bg-[#EDE8DA] border border-[#565248]/25 rounded-xs px-2.5 py-1 text-xs text-[#23211D] focus:outline-hidden focus:border-[#23211D]"
                            />
                            
                            <div className="flex items-center space-x-2 self-end sm:self-auto w-full sm:w-auto">
                              <div className="relative flex-1 sm:w-28">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 font-serif text-xs text-[#565248]">
                                  {currencySymbol}
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={line.budget || ''}
                                  onChange={(e) => handleUpdateLine(catKey, idx, 'budget', e.target.value)}
                                  placeholder="0"
                                  className="w-full bg-[#EDE8DA] border border-[#565248]/25 rounded-xs pl-6 pr-2 py-1 text-xs font-tabular font-medium text-[#23211D] focus:outline-hidden focus:border-[#23211D]"
                                />
                              </div>

                              {/* Live % of Spend Badge */}
                              <div className="shrink-0 bg-[#EDE8DA] border border-[#565248]/25 rounded-xs px-2 py-0.5 text-right flex flex-col justify-center min-w-[82px]">
                                <span className="text-[11px] font-bold text-[#A8342A] font-tabular leading-tight">
                                  {linePctOfSpend}% <span className="text-[9px] font-normal text-[#565248]">of spend</span>
                                </span>
                                <span className="text-[9px] text-[#565248] font-tabular leading-tight">
                                  {linePctOfCat}% of {cat.name}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveLine(catKey, idx)}
                                className="p-1 text-[#A8342A] hover:bg-[#EDE8DA] rounded-xs transition-colors cursor-pointer shrink-0"
                                title="Remove line"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add Line Button & Description */}
                  <div className="flex items-center justify-between pt-1 text-[11px] text-[#565248]">
                    <span className="truncate max-w-[65%]">
                      {cat.examples}
                    </span>
                    <button
                      id={`add-line-${catKey}`}
                      type="button"
                      onClick={() => handleAddLine(catKey)}
                      className="inline-flex items-center space-x-1 text-xs font-medium text-[#23211D] hover:text-[#A8342A] bg-[#E5DFCE] hover:bg-[#DCD5C4] border border-[#565248]/20 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3 text-[#A8342A]" />
                      <span>Add line</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Balance summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs pt-2 border-t border-[#565248]/15 gap-1.5">
            <span className="text-[#565248]">
              Sum of categories: <strong className="text-[#23211D] font-tabular">{formatCurrency(allocatedSum, currency)}</strong>
            </span>
            {difference !== 0 ? (
              <span className={`font-medium ${difference > 0 ? 'text-[#A8342A]' : 'text-[#B5652E]'}`}>
                {difference > 0 
                  ? `+${formatCurrency(difference, currency)} over planned` 
                  : `${formatCurrency(Math.abs(difference), currency)} unassigned`
                }
              </span>
            ) : (
              <span className="text-[#5C6E4E] font-medium flex items-center space-x-1">
                <Check className="w-3.5 h-3.5" />
                <span>Balances perfectly with planned expenses</span>
              </span>
            )}
          </div>

        </div>

        {/* Submit Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pt-4 border-t border-[#565248]/15">
          <div className="text-xs text-[#565248] italic flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#A8342A] shrink-0" />
            <span>{t.setupZenTip}</span>
          </div>

          <button
            id="save-plan-btn"
            type="submit"
            className="inline-flex items-center justify-center space-x-2 bg-[#A8342A] hover:bg-[#922D24] text-[#EDE8DA] font-serif font-bold px-7 py-3 rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer text-sm sm:text-base active:scale-[0.99] whitespace-nowrap shrink-0 border border-[#8F2B22]/30"
          >
            {hasSaved ? (
              <>
                <Check className="w-4 h-4 text-[#EDE8DA]" />
                <span className="whitespace-nowrap">{t.setupSavedBtn}</span>
              </>
            ) : (
              <>
                <span className="whitespace-nowrap">{t.setupSaveBtn}</span>
                <ArrowRight className="w-4 h-4 text-[#EDE8DA]" />
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};
