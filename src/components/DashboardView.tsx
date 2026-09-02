import React, { useState } from 'react';
import { 
  Category, 
  Expense, 
  Plan, 
  SavingsEntry, 
  SUPPORTED_CURRENCIES 
} from '../types';
import { formatCurrency, formatMonthName } from '../lib/storage';
import { HankoStamp } from './HankoStamp';
import { SavingsModal } from './SavingsModal';
import { getT, getCategoriesForCurrency } from '../lib/i18n';
import { 
  PlusCircle, 
  TrendingUp, 
  Sparkles, 
  ChevronRight, 
  Calendar, 
  Clock,
  PiggyBank,
  ChevronDown,
  ChevronUp,
  Trash2,
  Tag,
  Landmark,
  ShieldCheck,
  Copy,
  Plus,
  Check,
  ArrowRight,
  Building2,
  Wallet,
  HelpCircle
} from 'lucide-react';
import { ExpenseFlowChart } from './ExpenseFlowChart';

interface DashboardViewProps {
  monthKey: string;
  plan: Plan | null;
  expenses: Expense[];
  savingsEntries?: SavingsEntry[];
  allPlans?: Plan[];
  onSaveExpense?: (expense: Expense) => void;
  onSaveSavings?: (entry: SavingsEntry) => void;
  onDeleteSavings?: (id: string) => void;
  onRecordExpense: () => void;
  onOpenLedger: () => void;
  onOpenSetup: () => void;
  onOpenSetupWithCopy?: (sourcePlan: Plan) => void;
  onOpenReview: () => void;
  recentlyAddedId?: string | null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  monthKey,
  plan,
  expenses,
  savingsEntries = [],
  allPlans = [],
  onSaveExpense: _onSaveExpense,
  onSaveSavings,
  onDeleteSavings,
  onRecordExpense,
  onOpenLedger,
  onOpenSetup,
  onOpenSetupWithCopy,
  onOpenReview,
  recentlyAddedId,
}) => {
  const currency = plan?.currency || 'INR';
  const t = getT(currency);
  const categories = getCategoriesForCurrency(currency);
  const currencySymbol = SUPPORTED_CURRENCIES.find((c) => c.code === currency)?.symbol || '₹';

  const [isSavingsModalOpen, setIsSavingsModalOpen] = useState(false);

  const [expandedCategories, setExpandedCategories] = useState<Record<Category, boolean>>({
    survival: true,
    optional: true,
    culture: false,
    extra: false,
  });

  const toggleCategoryExpand = (cat: Category) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [cat]: !prev[cat],
    }));
  };

  // STRICT MONTH FILTERING FOR EXPENSES
  const activeExpenses = expenses.filter((e) => !e.deleted && e.monthKey === monthKey);

  // STRICT MONTH FILTERING FOR SAVINGS ENTRIES
  const activeSavings = savingsEntries.filter((s) => !s.deleted && s.monthKey === monthKey);

  // Compute spend totals strictly for this month
  const totalSpent = activeExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Category spends strictly for this month
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

  const income = plan?.income || 0;
  const savingsTarget = plan?.savingsTarget || 0;
  const plannedExpenses = plan?.totalExpenses || 0;

  // Actual logged savings set aside this month
  const loggedSavings = activeSavings.reduce((sum, s) => sum + s.amount, 0);

  // Projected Cash Surplus (Income - Expenses)
  const projectedSurplus = Math.max(0, income - totalSpent);
  const remainingSpendBudget = Math.max(0, plannedExpenses - totalSpent);

  // Savings Target Progress is driven by actual logged savings
  const savingsProgressPercent = savingsTarget > 0 
    ? Math.min(100, Math.round((loggedSavings / savingsTarget) * 100))
    : 0;

  // Recent 5 entries strictly from this month
  const recentEntries = [...activeExpenses]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  if (!plan) {
    const otherPlans = allPlans
      .filter((p) => p.monthKey !== monthKey)
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
    const previousPlan = otherPlans[0];

    return (
      <div className="text-center py-10 px-4 max-w-lg mx-auto space-y-5">
        <div className="w-16 h-16 rounded-full border-2 border-[#A8342A] mx-auto flex items-center justify-center bg-[#E5DFCE] text-[#A8342A]">
          <span className="font-serif text-2xl font-bold">
            M
          </span>
        </div>
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#23211D]">
            Begin {formatMonthName(monthKey)}
          </h2>
          <p className="text-sm text-[#565248] mt-1.5 leading-relaxed">
            {t.dashboardNoPlanSub}
          </p>
        </div>

        {/* Quick Copy Previous Plan Option if available */}
        {previousPlan && (
          <div className="p-4 rounded-lg bg-[#E5DFCE]/80 border border-[#565248]/25 text-left space-y-3 shadow-2xs">
            <div className="flex items-center space-x-2 text-xs font-serif font-bold text-[#A8342A] uppercase tracking-wider">
              <Copy className="w-3.5 h-3.5" />
              <span>Time-Saver</span>
            </div>
            <div>
              <p className="text-sm font-serif font-bold text-[#23211D]">
                Copy budget plan from {formatMonthName(previousPlan.monthKey)}
              </p>
              <p className="text-xs text-[#565248] mt-0.5">
                Quickly clone your income, savings target, and custom budget lines, then tweak whatever has changed this month.
              </p>
            </div>

            <div className="pt-2 border-t border-[#565248]/15 flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center space-x-2 text-[#565248] font-tabular">
                <span className="bg-[#EDE8DA] px-2 py-0.5 rounded-xs border border-[#565248]/15">
                  Income: <strong>{formatCurrency(previousPlan.income, currency)}</strong>
                </span>
                <span className="bg-[#EDE8DA] px-2 py-0.5 rounded-xs border border-[#565248]/15 text-[#5C6E4E]">
                  Savings: <strong>{formatCurrency(previousPlan.savingsTarget, currency)}</strong>
                </span>
              </div>

              <button
                id="copy-prev-plan-dash-btn"
                type="button"
                onClick={() => {
                  if (onOpenSetupWithCopy) {
                    onOpenSetupWithCopy(previousPlan);
                  } else {
                    onOpenSetup();
                  }
                }}
                className="inline-flex items-center space-x-1.5 bg-[#A8342A] hover:bg-[#8F2B22] text-[#EDE8DA] font-serif font-bold text-xs px-3.5 py-1.5 rounded-md shadow-2xs transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy & Customize</span>
              </button>
            </div>
          </div>
        )}

        <div className="pt-2">
          <button
            id="init-monthly-plan-btn"
            onClick={onOpenSetup}
            className={`inline-flex items-center space-x-2 ${
              previousPlan 
                ? 'text-xs font-serif font-medium text-[#565248] hover:text-[#23211D] underline'
                : 'bg-[#A8342A] hover:bg-[#8F2B22] text-[#EDE8DA] font-serif font-bold px-6 py-2.5 rounded-md shadow-xs'
            } transition-all cursor-pointer`}
          >
            <span>{previousPlan ? 'Or create a fresh plan from scratch' : t.dashboardBeginSetup}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  const destinationMeta: Record<string, { label: string; icon: React.ReactNode }> = {
    mutual_fund: {
      label: 'Mutual Fund / SIP / Stocks',
      icon: <TrendingUp className="w-3.5 h-3.5 text-[#35415C]" />,
    },
    fixed_deposit: {
      label: 'Fixed Deposit (FD)',
      icon: <Landmark className="w-3.5 h-3.5 text-[#5C6E4E]" />,
    },
    recurring_deposit: {
      label: 'Recurring Deposit (RD)',
      icon: <Building2 className="w-3.5 h-3.5 text-[#565248]" />,
    },
    savings_account: {
      label: 'High-Yield Savings',
      icon: <PiggyBank className="w-3.5 h-3.5 text-[#B5652E]" />,
    },
    cash: {
      label: 'Cash Reserve',
      icon: <Wallet className="w-3.5 h-3.5 text-[#23211D]" />,
    },
    other: {
      label: 'PPF / Gold / Other',
      icon: <HelpCircle className="w-3.5 h-3.5 text-[#A8342A]" />,
    },
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      
      {/* Month Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#565248]/20 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-serif text-[#A8342A] tracking-wider uppercase font-bold">
              {t.dashboardCurrentLedger}
            </span>
            <span className="text-[11px] text-[#565248]">({activeExpenses.length} {t.dashboardEntries})</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#23211D]">
            {formatMonthName(monthKey)}
          </h2>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            id="dashboard-record-savings-btn"
            onClick={() => setIsSavingsModalOpen(true)}
            className="flex items-center justify-center space-x-1.5 bg-[#5C6E4E] hover:bg-[#4B5B3E] text-[#EDE8DA] font-serif font-bold px-3.5 py-2.5 rounded-md shadow-xs transition-all active:scale-98 cursor-pointer text-xs sm:text-sm"
          >
            <PiggyBank className="w-4 h-4" />
            <span>+ Log Savings</span>
          </button>

          <button
            id="dashboard-record-expense-btn"
            onClick={onRecordExpense}
            className="flex items-center justify-center space-x-1.5 bg-[#A8342A] hover:bg-[#8F2B22] text-[#EDE8DA] font-serif font-bold px-4 py-2.5 rounded-md shadow-xs transition-all active:scale-98 cursor-pointer text-xs sm:text-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t.dashboardRecordExpense}</span>
          </button>
        </div>
      </div>

      {/* Monthly Improvement Commitment Banner */}
      {plan.improvementNotes && (
        <div className="bg-[#E5DFCE]/80 border-l-4 border-[#A8342A] p-3 sm:p-4 rounded-r-md flex items-start space-x-3 shadow-2xs">
          <Sparkles className="w-4 h-4 text-[#A8342A] shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-[#23211D]">
            <strong className="font-serif font-bold text-[#A8342A] mr-1.5">
              {t.dashboardMonthlyIntent}
            </strong>
            <span className="italic text-[#565248]">"{plan.improvementNotes}"</span>
          </div>
        </div>
      )}

      {/* Overview Metric Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Total Available Income */}
        <div className="bg-[#E5DFCE]/60 border border-[#565248]/20 rounded-md p-3">
          <span className="text-[11px] text-[#565248] uppercase tracking-wider block font-medium">
            {t.dashboardIncome}
          </span>
          <div className="font-serif text-lg sm:text-xl font-bold text-[#23211D] font-tabular mt-0.5">
            {formatCurrency(income, currency)}
          </div>
          <span className="text-[10px] text-[#565248] block mt-0.5">
            Starting monthly pool
          </span>
        </div>

        {/* Total Spent So Far */}
        <div className="bg-[#E5DFCE]/60 border border-[#565248]/20 rounded-md p-3">
          <span className="text-[11px] text-[#565248] uppercase tracking-wider block font-medium">
            {t.dashboardTotalSpent}
          </span>
          <div className="font-serif text-lg sm:text-xl font-bold text-[#A8342A] font-tabular mt-0.5">
            {formatCurrency(totalSpent, currency)}
          </div>
          <span className="text-[10px] text-[#565248] block mt-0.5 font-tabular">
            {plannedExpenses > 0 ? `${Math.round((totalSpent / plannedExpenses) * 100)}% of outlays` : '0%'}
            {income > 0 ? ` (${((totalSpent / income) * 100).toFixed(1)}% of income)` : ''}
          </span>
        </div>

        {/* Remaining Spend Budget */}
        <div className="bg-[#E5DFCE]/60 border border-[#565248]/20 rounded-md p-3">
          <span className="text-[11px] text-[#565248] uppercase tracking-wider block font-medium">
            {t.dashboardRemaining}
          </span>
          <div className={`font-serif text-lg sm:text-xl font-bold font-tabular mt-0.5 ${remainingSpendBudget > 0 ? 'text-[#35415C]' : 'text-[#A8342A]'}`}>
            {formatCurrency(remainingSpendBudget, currency)}
          </div>
          <span className="text-[10px] text-[#565248] block mt-0.5 font-tabular">
            {plannedExpenses > 0 ? `${Math.max(0, Math.round((remainingSpendBudget / plannedExpenses) * 100))}% left to spend` : 'Remaining budget'}
          </span>
        </div>

        {/* Savings Target */}
        <div className="bg-[#E5DFCE]/60 border border-[#565248]/20 rounded-md p-3">
          <span className="text-[11px] text-[#5C6E4E] uppercase tracking-wider block font-semibold">
            {t.dashboardTarget}
          </span>
          <div className="font-serif text-lg sm:text-xl font-bold text-[#5C6E4E] font-tabular mt-0.5">
            {formatCurrency(savingsTarget, currency)}
          </div>
          <span className="text-[10px] text-[#5C6E4E] block mt-0.5 font-tabular">
            {income > 0 ? `${((savingsTarget / income) * 100).toFixed(1)}% of income` : 'Target'}
            {loggedSavings > 0 ? ` (${loggedSavings >= savingsTarget ? 'Reached' : `${formatCurrency(loggedSavings, currency)} logged`})` : ''}
          </span>
        </div>
      </div>

      {/* Savings Target Progress Bar & Dedicated Logged Savings */}
      <div className="bg-[#E5DFCE]/70 border border-[#565248]/25 rounded-lg p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#565248]/15 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-[#5C6E4E] text-[#EDE8DA] flex items-center justify-center shadow-2xs">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-[#23211D]">
                Monthly Savings Target & Actual Progress
              </h3>
              <p className="text-[11px] text-[#565248]">
                {savingsProgressPercent}% of target goal achieved
              </p>
            </div>
          </div>
          
          <button
            id="open-savings-modal-link"
            onClick={() => setIsSavingsModalOpen(true)}
            className="flex items-center space-x-1.5 bg-[#5C6E4E] hover:bg-[#4B5B3E] text-[#EDE8DA] px-3 py-1.5 rounded-md font-serif font-bold text-xs shadow-xs transition-all active:scale-98 cursor-pointer self-start sm:self-auto"
          >
            <PiggyBank className="w-3.5 h-3.5" />
            <span>+ Log Savings</span>
          </button>
        </div>

        <div className="flex items-baseline justify-between font-tabular">
          <div>
            <span className="text-[10px] uppercase font-serif tracking-wider text-[#565248] font-bold block">
              Logged Actual
            </span>
            <span className="font-serif font-bold text-xl sm:text-2xl text-[#5C6E4E]">
              {formatCurrency(loggedSavings, currency)}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-serif tracking-wider text-[#565248] font-bold block">
              Target Goal
            </span>
            <span className="font-serif font-bold text-lg text-[#23211D]">
              {formatCurrency(savingsTarget, currency)}
            </span>
          </div>
        </div>

        {/* Brush-style progress bar based on ACTUAL LOGGED SAVINGS */}
        <div className="h-3.5 bg-[#EDE8DA] rounded-xs border border-[#565248]/30 overflow-hidden relative p-[1px]">
          <div
            className="h-full rounded-xs transition-all duration-500 relative"
            style={{
              width: `${savingsProgressPercent}%`,
              backgroundColor: '#5C6E4E',
              backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.08), rgba(255,255,255,0.08) 6px, transparent 6px, transparent 12px)',
            }}
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-[#565248] gap-1.5">
          <div>
            {loggedSavings >= savingsTarget ? (
              <span className="text-[#5C6E4E] font-medium flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Savings target is fully reached!</span>
              </span>
            ) : (
              <span>
                {formatCurrency(Math.max(0, savingsTarget - loggedSavings), currency)} remaining to hit target ({savingsProgressPercent}% saved)
              </span>
            )}
          </div>

          {/* Secondary Surplus Insight */}
          <div className="text-[11px] bg-[#EDE8DA] border border-[#565248]/15 px-2 py-1 rounded-xs text-[#565248]">
            <span>Projected Cash Surplus: </span>
            <strong className="text-[#23211D] font-tabular">
              {formatCurrency(income, currency)} - {formatCurrency(totalSpent, currency)} = {formatCurrency(projectedSurplus, currency)}
            </strong>
          </div>
        </div>

        {/* List of Logged Savings Entries for this month */}
        {activeSavings.length > 0 && (
          <div className="mt-3.5 pt-3.5 border-t border-[#565248]/15 space-y-2.5">
            <div className="flex items-center justify-between text-[11px] font-serif uppercase tracking-wider text-[#565248] font-bold">
              <span>Active Savings Log ({activeSavings.length}):</span>
              <span className="text-[#5C6E4E] font-tabular">
                Total: +{formatCurrency(loggedSavings, currency)}
              </span>
            </div>
            <div className="space-y-2">
              {activeSavings.map((entry) => {
                const dateObj = entry.date ? new Date(entry.date) : null;
                const formattedDate = dateObj && !isNaN(dateObj.getTime())
                  ? dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : '';
                const formattedTime = dateObj && !isNaN(dateObj.getTime())
                  ? dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                  : '';
                const meta = destinationMeta[entry.destination] || {
                  label: entry.destination,
                  icon: <Landmark className="w-3.5 h-3.5 text-[#5C6E4E]" />,
                };
                const destTitle = entry.destinationCustom || meta.label;

                return (
                  <div
                    key={entry.id}
                    className="bg-[#EDE8DA]/95 border border-[#565248]/20 rounded-xl p-3 sm:p-3.5 hover:border-[#565248]/35 transition-all shadow-2xs space-y-2"
                  >
                    {/* Primary Row: Vehicle + CAGR on Left, Single-Line Price Badge on Right */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center space-x-2.5 min-w-0 flex-wrap gap-y-1">
                        <div className="w-7 h-7 rounded-lg bg-[#E5DFCE] border border-[#565248]/20 flex items-center justify-center shrink-0 shadow-2xs">
                          {meta.icon}
                        </div>
                        <div className="flex items-center space-x-2 flex-wrap gap-y-0.5 min-w-0">
                          <span className="font-serif font-bold text-xs sm:text-sm text-[#23211D] truncate">
                            {destTitle}
                          </span>
                          {entry.committedReturn && (
                            <span className="text-[10px] bg-[#5C6E4E]/10 border border-[#5C6E4E]/25 text-[#5C6E4E] px-1.5 py-0.5 rounded-md font-serif font-semibold font-tabular whitespace-nowrap">
                              📈 {entry.committedReturn}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Saved Amount Pill on Top Right with Delete Action */}
                      <div className="flex items-center space-x-2 shrink-0">
                        <div className="inline-flex items-center space-x-1 bg-[#5C6E4E]/10 border border-[#5C6E4E]/30 px-3 py-1 rounded-lg shadow-2xs font-tabular whitespace-nowrap">
                          <span className="text-xs font-bold text-[#5C6E4E]/70 font-sans">+</span>
                          <span className="font-serif font-bold text-sm sm:text-base text-[#5C6E4E]">
                            {formatCurrency(entry.amount, currency)}
                          </span>
                        </div>
                        {onDeleteSavings && (
                          <button
                            type="button"
                            onClick={() => onDeleteSavings(entry.id)}
                            className="p-1.5 text-[#565248]/40 hover:text-[#A8342A] hover:bg-[#E5DFCE] rounded-md transition-colors cursor-pointer shrink-0"
                            title="Delete savings entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Secondary Row: Notes on Left, Date & Time on Right */}
                    <div className="flex items-center justify-between text-xs text-[#565248] pt-1.5 border-t border-[#565248]/10 gap-2">
                      <span className="text-xs text-[#565248] italic truncate max-w-[70%]">
                        {entry.notes || `Deposit to ${destTitle}`}
                      </span>

                      <span className="text-[11px] text-[#565248]/80 font-tabular whitespace-nowrap shrink-0">
                        {formattedDate}{formattedTime ? ` • ${formattedTime}` : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Daily Expense Flow Curve & 7-Day DayBook Strip (Interactive Wave & Day Inspector) */}
      <ExpenseFlowChart
        monthKey={monthKey}
        expenses={expenses}
        plan={plan}
        currency={currency}
        onRecordExpenseForDate={(_dateStr) => {
          onRecordExpense();
        }}
        onOpenLedger={onOpenLedger}
      />

      {/* Four Category Budget Bars & Sub-Category Budget Lines */}
      <div className="bg-[#E5DFCE]/70 border border-[#565248]/25 rounded-lg p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#565248]/15 pb-2.5">
          <div>
            <h3 className="font-serif text-base font-bold text-[#23211D]">
              {t.dashboardCategoryBudgets}
            </h3>
            <p className="text-xs text-[#565248]">
              {t.dashboardCategorySubtitle}
            </p>
          </div>
          <button
            id="adjust-budgets-btn"
            onClick={onOpenSetup}
            className="text-xs text-[#A8342A] hover:underline font-serif font-medium cursor-pointer"
          >
            Adjust Budgets
          </button>
        </div>

        <div className="space-y-4">
          {(Object.keys(categories) as Category[]).map((catKey) => {
            const cat = categories[catKey];
            const budget = plan.categoryBudgets?.[catKey] || 0;
            const spent = categorySpends[catKey] || 0;
            const remaining = budget - spent;
            const percent = budget > 0 ? Math.min(150, Math.round((spent / budget) * 100)) : 0;
            const isOver = spent > budget && budget > 0;
            const catPctOfPlanned = plannedExpenses > 0 ? ((budget / plannedExpenses) * 100).toFixed(1) : '0';
            
            const lines = plan.categoryBudgetLines?.[catKey] || [];
            const hasLines = lines.length > 0;
            const isExpanded = expandedCategories[catKey];

            return (
              <div key={catKey} className="bg-[#EDE8DA]/80 border border-[#565248]/20 rounded-md p-3 space-y-2 shadow-2xs">
                <div className="flex items-baseline justify-between text-xs sm:text-sm flex-wrap gap-1">
                  <div className="flex items-center space-x-2 flex-wrap">
                    <span 
                      className="w-2.5 h-2.5 rounded-xs inline-block" 
                      style={{ backgroundColor: cat.color }} 
                    />
                    <span className="font-serif font-bold text-[#23211D]">
                      {cat.name}
                    </span>
                    <span className="text-xs font-serif text-[#565248]">
                      ({cat.badge})
                    </span>
                    <span className="text-[10px] font-semibold text-[#565248] bg-[#E5DFCE] border border-[#565248]/15 px-1.5 py-0.2 rounded-xs font-tabular">
                      {catPctOfPlanned}% of outlays
                    </span>
                  </div>

                  <div className="flex items-baseline space-x-2 font-tabular">
                    <span className="font-bold text-[#23211D]">
                      {formatCurrency(spent, currency)}
                    </span>
                    <span className="text-[#565248] text-xs">
                      / {formatCurrency(budget, currency)}
                    </span>
                    <span className={`text-[11px] font-medium ${isOver ? 'text-[#A8342A]' : 'text-[#565248]'}`}>
                      ({percent}% used)
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="h-2.5 bg-[#E5DFCE] rounded-xs border border-[#565248]/25 overflow-hidden p-[1px]">
                  <div
                    className="h-full rounded-xs transition-all duration-300"
                    style={{
                      width: `${Math.min(100, percent)}%`,
                      backgroundColor: isOver ? '#A8342A' : cat.color,
                      opacity: isOver ? 1 : 0.85,
                    }}
                  />
                </div>

                <div className="flex justify-between items-center text-[10px] text-[#565248]">
                  <span>{cat.description}</span>
                  <span className={isOver ? 'text-[#A8342A] font-semibold' : 'text-[#565248]'}>
                    {isOver 
                      ? `Over by ${formatCurrency(Math.abs(remaining), currency)}` 
                      : `${formatCurrency(remaining, currency)} remaining`
                    }
                  </span>
                </div>

                {/* Sub-category budget lines toggle & display */}
                {hasLines && (
                  <div className="pt-2 border-t border-[#565248]/15 mt-2">
                    <button
                      type="button"
                      onClick={() => toggleCategoryExpand(catKey)}
                      className="flex items-center justify-between w-full text-[11px] text-[#565248] hover:text-[#23211D] cursor-pointer"
                    >
                      <span className="flex items-center space-x-1 font-semibold">
                        <Tag className="w-3 h-3 text-[#A8342A]" />
                        <span>
                          {lines.length} Budget Lines ({lines.map(l => l.name).filter(Boolean).join(', ')})
                        </span>
                      </span>
                      <span className="flex items-center space-x-0.5 text-[#A8342A]">
                        <span>{isExpanded ? 'Hide' : 'View lines & splits'}</span>
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="mt-2 space-y-2 bg-[#E5DFCE]/60 p-2.5 rounded-md border border-[#565248]/15">
                        {lines.map((line) => {
                          // Compute spending for this specific line
                          const lineSpent = activeExpenses
                            .filter((e) => e.category === catKey && (e.budgetLineId === line.id || e.budgetLineName === line.name))
                            .reduce((sum, e) => sum + e.amount, 0);
                          const lineBudget = line.budget || 0;
                          const linePercent = lineBudget > 0 ? Math.min(150, Math.round((lineSpent / lineBudget) * 100)) : 0;
                          const lineOver = lineSpent > lineBudget && lineBudget > 0;
                          const linePctOfTotalSpend = plannedExpenses > 0 ? ((lineBudget / plannedExpenses) * 100).toFixed(1) : '0';
                          const linePctOfCat = budget > 0 ? ((lineBudget / budget) * 100).toFixed(1) : '0';

                          return (
                            <div key={line.id} className="text-[11px] space-y-1 bg-[#EDE8DA]/70 p-2 rounded-xs border border-[#565248]/10">
                              <div className="flex items-center justify-between text-[#23211D] flex-wrap gap-1">
                                <div className="flex items-center space-x-1.5 min-w-0">
                                  <span className="font-medium truncate">• {line.name}</span>
                                  {lineBudget > 0 && (
                                    <span className="text-[9px] font-bold text-[#A8342A] bg-[#EDE8DA] border border-[#565248]/20 px-1.5 py-0.2 rounded-xs font-tabular">
                                      {linePctOfTotalSpend}% of spend
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center space-x-1 font-tabular text-xs">
                                  <span className="font-semibold">{formatCurrency(lineSpent, currency)}</span>
                                  {lineBudget > 0 && (
                                    <>
                                      <span className="text-[#565248]">/ {formatCurrency(lineBudget, currency)}</span>
                                      <span className={`text-[10px] font-medium ${lineOver ? 'text-[#A8342A] font-bold' : 'text-[#565248]'}`}>
                                        ({linePercent}% used)
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                              {lineBudget > 0 && (
                                <div className="flex items-center justify-between text-[9px] text-[#565248] font-tabular">
                                  <span>{linePctOfCat}% of {cat.name} allocation</span>
                                  <span>
                                    {lineOver 
                                      ? `Over by ${formatCurrency(lineSpent - lineBudget, currency)}` 
                                      : `${formatCurrency(lineBudget - lineSpent, currency)} remaining`}
                                  </span>
                                </div>
                              )}
                              {lineBudget > 0 && (
                                <div className="h-1.5 bg-[#EDE8DA] rounded-xs overflow-hidden">
                                  <div
                                    className="h-full rounded-xs transition-all duration-300"
                                    style={{
                                      width: `${Math.min(100, linePercent)}%`,
                                      backgroundColor: lineOver ? '#A8342A' : cat.color,
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Untagged / General expenses in this category */}
                        {(() => {
                          const lineIds = new Set(lines.map((l) => l.id));
                          const lineNames = new Set(lines.map((l) => l.name));
                          const untaggedSpent = activeExpenses
                            .filter((e) => e.category === catKey && !lineIds.has(e.budgetLineId || '') && !lineNames.has(e.budgetLineName || ''))
                            .reduce((sum, e) => sum + e.amount, 0);

                          if (untaggedSpent > 0) {
                            return (
                              <div className="text-[10px] text-[#565248] pt-1 border-t border-[#565248]/10 flex items-center justify-between italic font-tabular">
                                <span>• Other / General untagged expenses:</span>
                                <span className="font-medium">{formatCurrency(untaggedSpent, currency)}</span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 5 Most Recent Entries Strictly for this month */}
      <div className="bg-[#E5DFCE]/70 border border-[#565248]/25 rounded-lg p-4 sm:p-5 shadow-2xs space-y-3.5">
        <div className="flex items-center justify-between border-b border-[#565248]/15 pb-3">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-[#A8342A]" />
            <h3 className="font-serif text-base font-bold text-[#23211D]">
              Recent Entries
            </h3>
          </div>
          <button
            id="view-full-ledger-btn"
            onClick={onOpenLedger}
            className="flex items-center space-x-1 text-xs bg-[#EDE8DA] hover:bg-[#E5DFCE] border border-[#565248]/25 text-[#23211D] px-2.5 py-1 rounded-md font-serif font-semibold transition-colors cursor-pointer shadow-2xs group"
          >
            <span>View All Records ({activeExpenses.length})</span>
            <ArrowRight className="w-3 h-3 text-[#A8342A] transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        {recentEntries.length === 0 ? (
          <div className="text-center py-6 text-xs text-[#565248] italic">
            {t.dashboardNoExpenses}
          </div>
        ) : (
          <div className="space-y-2">
            {recentEntries.map((item) => {
              const cat = categories[item.category];
              const dateObj = new Date(item.date);
              const formattedDate = dateObj.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              });
              const formattedTime = dateObj.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              });
              const isJustAdded = recentlyAddedId === item.id;

              return (
                <div
                  key={item.id}
                  className={`bg-[#EDE8DA]/80 border border-[#565248]/20 rounded-lg p-3 hover:bg-[#EDE8DA] transition-all space-y-1.5 shadow-2xs ${
                    isJustAdded ? 'ring-2 ring-[#A8342A]/40 bg-[#A8342A]/5' : ''
                  }`}
                >
                  {/* Top Row: Category Pillar Pill + Budget Line Tag (Left), Spent Amount Pill (Right) */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                      {/* Category Pillar Pill */}
                      <span 
                        className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-serif font-bold text-[#EDE8DA] shadow-2xs"
                        style={{ backgroundColor: cat.color }}
                      >
                        <span>{cat.name}</span>
                      </span>

                      {/* Budget Line Tag if present */}
                      {item.budgetLineName && (
                        <span className="text-[10px] bg-[#E5DFCE] border border-[#565248]/25 px-1.5 py-0.5 rounded-md font-serif text-[#23211D]">
                          🏷️ {item.budgetLineName}
                        </span>
                      )}

                      {isJustAdded && (
                        <HankoStamp size="sm" animate={true} text={t.stampRecorded} />
                      )}
                    </div>

                    {/* Spent Amount Pill on Top Right */}
                    <div className="bg-[#E5DFCE] border border-[#565248]/25 px-2.5 py-0.5 rounded-md shadow-2xs font-tabular">
                      <span className="font-serif font-bold text-sm sm:text-base text-[#A8342A]">
                        {formatCurrency(item.amount, currency)}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Row: Description in clean text, with time & date at bottom */}
                  <div className="flex items-center justify-between text-xs text-[#565248] pt-0.5">
                    <span className="text-xs sm:text-sm font-medium text-[#23211D] truncate max-w-[70%]">
                      {item.note || <span className="italic text-[#565248]">{cat.name}</span>}
                    </span>

                    <span className="text-[11px] text-[#565248] font-tabular whitespace-nowrap">
                      {formattedDate} • {formattedTime}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Month-End Review Shortcut banner */}
      <div className="bg-[#EDE8DA] border border-[#565248]/20 rounded-md p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2.5 text-[#565248]">
          <Calendar className="w-4 h-4 text-[#A8342A] shrink-0" />
          <span>
            Ready to reflect on your spending habits? Open the Month-End Reflection.
          </span>
        </div>
        <button
          id="dashboard-open-review-btn"
          onClick={onOpenReview}
          className="text-[#A8342A] hover:underline font-serif font-bold shrink-0 cursor-pointer"
        >
          {t.dashboardMonthReview} →
        </button>
      </div>

      {/* Savings Modal */}
      <SavingsModal
        isOpen={isSavingsModalOpen}
        onClose={() => setIsSavingsModalOpen(false)}
        onSaveSavings={(newSavings) => {
          if (onSaveSavings) {
            onSaveSavings(newSavings);
          }
        }}
        currency={currency}
        selectedMonth={monthKey}
      />
    </div>
  );
};
