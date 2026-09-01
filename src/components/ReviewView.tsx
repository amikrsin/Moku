import React, { useState, useEffect } from 'react';
import { 
  Category, 
  Expense, 
  Plan 
} from '../types';
import { formatCurrency, formatMonthName } from '../lib/storage';
import { getT, getCategoriesForCurrency } from '../lib/i18n';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Save, 
  ListOrdered, 
  ArrowRight,
  FileText
} from 'lucide-react';

interface ReviewViewProps {
  monthKey: string;
  plan: Plan | null;
  expenses: Expense[];
  onSavePlan: (plan: Plan) => void;
  onOpenLedger: () => void;
  onOpenSetup: () => void;
}

export const ReviewView: React.FC<ReviewViewProps> = ({
  monthKey,
  plan,
  expenses,
  onSavePlan,
  onOpenLedger,
  onOpenSetup,
}) => {
  const currency = plan?.currency || 'INR';
  const t = getT(currency);
  const categories = getCategoriesForCurrency(currency);

  const activeExpenses = expenses.filter((e) => !e.deleted && e.monthKey === monthKey);

  const [reflection, setReflection] = useState<string>(plan?.reflection || '');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (plan?.reflection !== undefined) {
      setReflection(plan.reflection);
    }
  }, [plan?.reflection]);

  if (!plan) {
    return (
      <div className="text-center py-12 px-4 max-w-md mx-auto space-y-4">
        <h2 className="font-serif text-2xl font-bold text-[#23211D]">
          No Plan for {formatMonthName(monthKey)}
        </h2>
        <p className="text-sm text-[#565248]">
          To conduct a month-end review, you first need to establish your four-question monthly budget plan.
        </p>
        <button
          id="review-create-plan-btn"
          onClick={onOpenSetup}
          className="inline-flex items-center space-x-2 bg-[#A8342A] text-[#EDE8DA] font-serif font-bold px-5 py-2.5 rounded-md hover:bg-[#8F2B22] cursor-pointer"
        >
          <span>{t.dashboardBeginSetup}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Compute category totals
  const categorySpends: Record<Category, number> = {
    survival: 0,
    optional: 0,
    culture: 0,
    extra: 0,
  };

  activeExpenses.forEach((e) => {
    if (categorySpends[e.category] !== undefined) {
      categorySpends[e.category] += e.amount;
    }
  });

  const totalSpent = activeExpenses.reduce((sum, e) => sum + e.amount, 0);
  const income = plan.income;
  const savingsTarget = plan.savingsTarget;
  const plannedExpenses = plan.totalExpenses;

  const actualSavings = Math.max(0, income - totalSpent);
  const savingsDiff = actualSavings - savingsTarget;
  const isSavingsMet = savingsDiff >= 0;

  const handleSaveReflection = () => {
    const updatedPlan: Plan = {
      ...plan,
      reflection: reflection.trim(),
      updatedAt: Date.now(),
    };
    onSavePlan(updatedPlan);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto py-1">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#565248]/20 pb-4">
        <div>
          <span className="text-xs font-serif text-[#A8342A] uppercase tracking-wider font-bold">
            {t.reviewHeaderSubtitle}
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#23211D] mt-0.5">
            {formatMonthName(monthKey)} {t.reviewHeaderTitle}
          </h2>
        </div>

        <button
          id="review-view-ledger-btn"
          onClick={onOpenLedger}
          className="inline-flex items-center space-x-1.5 text-xs bg-[#E5DFCE] hover:bg-[#DFD8C5] border border-[#565248]/30 px-3 py-2 rounded-md font-medium text-[#23211D] transition-colors cursor-pointer self-start sm:self-auto"
        >
          <ListOrdered className="w-4 h-4 text-[#565248]" />
          <span>Inspect Ledger Entries</span>
        </button>
      </div>

      {/* Savings Outcome Card */}
      <div 
        className="rounded-lg border p-4 sm:p-6 shadow-2xs space-y-4"
        style={{
          backgroundColor: isSavingsMet ? 'rgba(92, 110, 78, 0.08)' : 'rgba(168, 52, 42, 0.08)',
          borderColor: isSavingsMet ? 'rgba(92, 110, 78, 0.35)' : 'rgba(168, 52, 42, 0.35)',
        }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            {isSavingsMet ? (
              <div className="w-8 h-8 rounded-full bg-[#5C6E4E] text-[#EDE8DA] flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#A8342A] text-[#EDE8DA] flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5" />
              </div>
            )}
            <div>
              <h3 className="font-serif text-lg font-bold text-[#23211D]">
                {isSavingsMet ? t.reviewSavingsAchieved : t.reviewSavingsShortfall}
              </h3>
              <p className="text-xs text-[#565248]">
                {isSavingsMet
                  ? `You preserved ${formatCurrency(actualSavings, currency)}, exceeding your target by ${formatCurrency(savingsDiff, currency)}.`
                  : `You preserved ${formatCurrency(actualSavings, currency)}, which is ${formatCurrency(Math.abs(savingsDiff), currency)} below your target.`
                }
              </p>
            </div>
          </div>
        </div>

        {/* Breakdown row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#565248]/15 text-xs">
          <div>
            <span className="text-[#565248] block">{t.dashboardIncome}</span>
            <strong className="font-serif font-bold text-[#23211D] text-sm font-tabular">
              {formatCurrency(income, currency)}
            </strong>
          </div>
          <div>
            <span className="text-[#565248] block">{t.dashboardTotalSpent}</span>
            <strong className="font-serif font-bold text-[#A8342A] text-sm font-tabular">
              {formatCurrency(totalSpent, currency)}
            </strong>
            <span className="text-[10px] text-[#565248] block font-tabular">
              {income > 0 ? `${((totalSpent / income) * 100).toFixed(1)}% of income` : ''}
            </span>
          </div>
          <div>
            <span className="text-[#565248] block">Target Savings</span>
            <strong className="font-serif font-bold text-[#5C6E4E] text-sm font-tabular">
              {formatCurrency(savingsTarget, currency)}
            </strong>
            <span className="text-[10px] text-[#565248] block font-tabular">
              {income > 0 ? `${((savingsTarget / income) * 100).toFixed(1)}% of income` : ''}
            </span>
          </div>
          <div>
            <span className="text-[#565248] block">Actual Net Savings</span>
            <strong className={`font-serif font-bold text-sm font-tabular ${isSavingsMet ? 'text-[#5C6E4E]' : 'text-[#A8342A]'}`}>
              {formatCurrency(actualSavings, currency)}
            </strong>
            <span className="text-[10px] text-[#565248] block font-tabular">
              {income > 0 ? `${((actualSavings / income) * 100).toFixed(1)}% preserved` : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Planned vs Actual Per Category Table */}
      <div className="bg-[#E5DFCE]/70 border border-[#565248]/20 rounded-lg p-4 sm:p-5 shadow-2xs space-y-4">
        <div>
          <h3 className="font-serif text-base font-bold text-[#23211D]">
            {t.reviewPlannedVsActual}
          </h3>
          <p className="text-xs text-[#565248]">
            Comparing your allocation against your real-world outlays
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-[#565248]/25 text-[11px] text-[#565248] uppercase tracking-wider font-semibold">
                <th className="py-2 pr-2">Category</th>
                <th className="py-2 px-2 text-right">Planned</th>
                <th className="py-2 px-2 text-right">Actual</th>
                <th className="py-2 pl-2 text-right">Difference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#565248]/15 font-tabular">
              {(Object.keys(categories) as Category[]).map((catKey) => {
                const cat = categories[catKey];
                const planned = plan.categoryBudgets?.[catKey] || 0;
                const actual = categorySpends[catKey] || 0;
                const diff = planned - actual; // positive means under budget
                const isOver = actual > planned && planned > 0;

                return (
                  <tr key={catKey} className="hover:bg-[#EDE8DA]/50 transition-colors">
                    <td className="py-2.5 pr-2">
                      <div className="flex items-center space-x-2">
                        <span 
                          className="w-2.5 h-2.5 rounded-xs inline-block" 
                          style={{ backgroundColor: cat.color }} 
                        />
                        <span className="font-serif font-bold text-[#23211D]">
                          {cat.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-right text-[#565248]">
                      <div>{formatCurrency(planned, currency)}</div>
                      <div className="text-[10px] text-[#565248]/70">
                        {plannedExpenses > 0 ? `${((planned / plannedExpenses) * 100).toFixed(1)}%` : '0%'}
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-right font-bold text-[#23211D]">
                      <div>{formatCurrency(actual, currency)}</div>
                      <div className="text-[10px] text-[#565248] font-normal">
                        {totalSpent > 0 ? `${((actual / totalSpent) * 100).toFixed(1)}%` : '0%'}
                      </div>
                    </td>
                    <td className={`py-2.5 pl-2 text-right font-medium ${isOver ? 'text-[#A8342A]' : 'text-[#5C6E4E]'}`}>
                      {diff >= 0 ? `-${formatCurrency(diff, currency)} under` : `+${formatCurrency(Math.abs(diff), currency)} over`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#565248]/30 font-bold font-tabular">
                <td className="py-2.5 pr-2 font-serif text-[#23211D]">Total Expenses</td>
                <td className="py-2.5 px-2 text-right text-[#565248]">{formatCurrency(plannedExpenses, currency)}</td>
                <td className="py-2.5 px-2 text-right text-[#23211D]">{formatCurrency(totalSpent, currency)}</td>
                <td className={`py-2.5 pl-2 text-right ${totalSpent > plannedExpenses ? 'text-[#A8342A]' : 'text-[#5C6E4E]'}`}>
                  {plannedExpenses - totalSpent >= 0
                    ? `-${formatCurrency(plannedExpenses - totalSpent, currency)} under`
                    : `+${formatCurrency(totalSpent - plannedExpenses, currency)} over`}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Free-text Reflection */}
      <div className="bg-[#E5DFCE]/70 border border-[#565248]/20 rounded-lg p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-[#A8342A]" />
            <h3 className="font-serif text-base font-bold text-[#23211D]">
              {t.reviewWrittenReflectionTitle}
            </h3>
          </div>
          {isSaved && (
            <span className="text-xs text-[#5C6E4E] font-medium flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{t.reviewSavedBadge}</span>
            </span>
          )}
        </div>

        <p className="text-xs text-[#565248] leading-relaxed">
          {t.reviewPrompts}
        </p>

        <textarea
          id="monthly-reflection-textarea"
          rows={5}
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          placeholder={t.reviewReflectionPlaceholder}
          className="w-full bg-[#EDE8DA] border border-[#565248]/30 rounded-md p-3 text-xs sm:text-sm text-[#23211D] leading-relaxed focus:outline-hidden focus:border-[#A8342A] placeholder:text-[#565248]/50"
        />

        <div className="flex justify-end pt-1">
          <button
            id="save-reflection-btn"
            type="button"
            onClick={handleSaveReflection}
            className="flex items-center space-x-1.5 bg-[#23211D] hover:bg-[#35415C] text-[#EDE8DA] font-serif font-bold text-xs sm:text-sm px-4 py-2 rounded-md shadow-xs transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{t.reviewSaveReflectionBtn}</span>
          </button>
        </div>
      </div>

    </div>
  );
};
