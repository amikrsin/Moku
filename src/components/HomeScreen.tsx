import React, { useState, useMemo } from 'react';
import { 
  ChevronDown, 
  Moon, 
  Sun, 
  ArrowUpRight, 
  PlusCircle, 
  Clock, 
  Inbox,
  Sparkles,
  Calendar
} from 'lucide-react';
import { Expense, Plan, SavingsEntry, UserProfile, CATEGORIES, Category } from '../types';
import { formatCurrency, formatMonthName, computeCategorySectorBreakdown } from '../lib/storage';
import { CategoryBudgetCard } from './budget/CategoryBudgetCard';
import { PlanVsActual } from './budget/PlanVsActual';
import { TransactionItem } from './transactions/TransactionItem';
import { AppCard } from './ui/AppCard';
import { AppButton } from './ui/AppButton';
import { MoneyAmount } from './ui/MoneyAmount';
import { EmptyState } from './ui/EmptyState';

interface HomeScreenProps {
  monthKey: string;
  onChangeMonth: (monthKey: string) => void;
  plan: Plan | null;
  expenses: Expense[];
  savingsEntries: SavingsEntry[];
  allPlans: Plan[];
  user: UserProfile;
  currency: string;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenQuickAdd: () => void;
  onOpenInbox: () => void;
  onOpenPlanSetup: () => void;
  onOpenSavingsModal: () => void;
  inboxPendingCount: number;
}

export function HomeScreen({
  monthKey,
  onChangeMonth,
  plan,
  expenses,
  savingsEntries,
  allPlans,
  user,
  currency,
  isDarkMode,
  onToggleDarkMode,
  onOpenQuickAdd,
  onOpenInbox,
  onOpenPlanSetup,
  onOpenSavingsModal,
  inboxPendingCount,
}: HomeScreenProps) {
  const [expandedCategories, setExpandedCategories] = useState<Record<Category, boolean>>({
    survival: true,
    optional: false,
    culture: false,
    extra: false,
  });

  const toggleExpand = (cat: Category) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  // Compute monthly financials
  const activeExpenses = useMemo(() => {
    return expenses.filter((e) => e.monthKey === monthKey && !e.deleted);
  }, [expenses, monthKey]);

  const activeSavings = useMemo(() => {
    return savingsEntries.filter((s) => s.monthKey === monthKey && !s.deleted);
  }, [savingsEntries, monthKey]);

  const totalSpent = useMemo(() => {
    return activeExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [activeExpenses]);

  const totalSaved = useMemo(() => {
    return activeSavings.reduce((sum, s) => sum + s.amount, 0);
  }, [activeSavings]);

  const income = plan ? (plan.income ?? 0) : 0;
  const savingsTarget = plan ? (plan.savingsTarget ?? 0) : 0;
  const availableToSpendBudget = Math.max(0, income - savingsTarget);
  const remainingToSpend = availableToSpendBudget - totalSpent;

  // Days in month & daily pacing calculation
  const { daysRemaining, dailyPace } = useMemo(() => {
    const now = new Date();
    const [yearStr, monthStr] = monthKey.split('-');
    const planYear = parseInt(yearStr, 10);
    const planMonth = parseInt(monthStr, 10);
    
    // Total days in the selected month
    const totalDaysInMonth = new Date(planYear, planMonth, 0).getDate();
    
    let daysLeft = totalDaysInMonth;
    if (now.getFullYear() === planYear && (now.getMonth() + 1) === planMonth) {
      daysLeft = Math.max(1, totalDaysInMonth - now.getDate() + 1);
    } else if (now.getFullYear() > planYear || (now.getFullYear() === planYear && (now.getMonth() + 1) > planMonth)) {
      daysLeft = 0;
    }

    const pace = daysLeft > 0 && remainingToSpend > 0 ? Math.round(remainingToSpend / daysLeft) : 0;
    return { daysRemaining: daysLeft, dailyPace: pace };
  }, [monthKey, remainingToSpend]);

  const spendPercentage = availableToSpendBudget > 0 
    ? Math.min(100, Math.round((totalSpent / availableToSpendBudget) * 100))
    : 0;
  const remainingPercentage = Math.max(0, 100 - spendPercentage);

  const savingsPercentage = savingsTarget > 0
    ? Math.min(100, Math.round((totalSaved / savingsTarget) * 100))
    : 0;

  // Sorted recent activity
  const recentTransactions = useMemo(() => {
    return [...activeExpenses]
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, 6);
  }, [activeExpenses]);

  // Greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const name = user.displayName?.split(' ')[0] || 'Friend';
    if (hour < 12) return `Good morning, ${name}`;
    if (hour < 18) return `Good afternoon, ${name}`;
    return `Good evening, ${name}`;
  }, [user]);

  // Months available for switching
  const monthOptions = useMemo(() => {
    const set = new Set<string>();
    set.add(monthKey);
    allPlans.forEach((p) => set.add(p.monthKey));
    const d = new Date();
    for (let i = -2; i <= 2; i++) {
      const target = new Date(d.getFullYear(), d.getMonth() + i, 1);
      const key = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}`;
      set.add(key);
    }
    return Array.from(set).sort().reverse();
  }, [allPlans, monthKey]);

  return (
    <div className="space-y-5 pb-8 animate-in fade-in duration-200">
      {/* Top Bar: Month Selector & Theme Toggle */}
      <div className="flex items-center justify-between pt-1">
        <div className="relative inline-flex items-center">
          <select
            id="home-month-select"
            value={monthKey}
            onChange={(e) => onChangeMonth(e.target.value)}
            className="appearance-none bg-[var(--moku-surface-secondary)] text-[var(--moku-text-primary)] text-xs font-semibold py-2 pl-3.5 pr-8 rounded-xl border border-[var(--moku-outline)] outline-none cursor-pointer hover:border-[var(--moku-primary)] transition-colors"
          >
            {monthOptions.map((m) => (
              <option key={m} value={m}>
                {formatMonthName(m)}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[var(--moku-text-secondary)] absolute right-2.5 pointer-events-none" />
        </div>

        <div className="flex items-center space-x-2">
          {inboxPendingCount > 0 && (
            <button
              onClick={onOpenInbox}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[var(--moku-primary-container)] text-[var(--moku-primary)] text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>{inboxPendingCount} pending</span>
            </button>
          )}

          <button
            id="theme-toggle-btn"
            type="button"
            onClick={onToggleDarkMode}
            className="p-2 rounded-xl bg-[var(--moku-surface-secondary)] text-[var(--moku-text-primary)] border border-[var(--moku-outline)] hover:bg-[var(--moku-surface-tertiary)] transition-colors cursor-pointer"
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-[var(--moku-primary)]" /> : <Moon className="w-4 h-4 text-[var(--moku-primary)]" />}
          </button>
        </div>
      </div>

      {/* Greeting & Headline */}
      <div>
        <div className="text-xs font-medium text-[var(--moku-text-secondary)] tracking-wide">
          {greeting}
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--moku-text-primary)] mt-0.5">
          Here&apos;s your money this month.
        </h1>
      </div>

      {/* Plan Not Set Notice Banner */}
      {(!plan || (plan.income === 0 && plan.savingsTarget === 0)) && (
        <div className="p-4 rounded-[22px] bg-[var(--moku-primary-container)] border border-[var(--moku-primary)]/30 flex items-center justify-between shadow-2xs animate-in fade-in duration-200">
          <div className="space-y-0.5 pr-2">
            <span className="text-xs font-bold text-[var(--moku-primary)] block">
              Monthly Plan Not Set
            </span>
            <p className="text-xs text-[var(--moku-text-secondary)]">
              Set your expected income and savings goal for {formatMonthName(monthKey)} to unlock mindful budget tracking.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenPlanSetup}
            className="px-3.5 py-2 rounded-xl bg-[var(--moku-primary)] text-white text-xs font-bold shrink-0 hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
          >
            Set Plan
          </button>
        </div>
      )}

      {/* HERO CARD: Available to Spend */}
      <div className="bg-[var(--moku-primary)] text-white rounded-[26px] p-6 shadow-md relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold tracking-wider uppercase opacity-85">
            Available to spend
          </div>
          <button
            onClick={onOpenPlanSetup}
            className="text-[11px] font-semibold underline underline-offset-2 opacity-90 hover:opacity-100 cursor-pointer"
          >
            {plan ? 'Adjust plan ›' : 'Set monthly plan ›'}
          </button>
        </div>

        <div className="text-4xl sm:text-5xl font-extrabold tracking-tight font-tabular my-3">
          {formatCurrency(remainingToSpend, currency)}
        </div>

        <div className="flex items-center justify-between text-xs opacity-90 pt-1">
          <span>{formatMonthName(monthKey)}</span>
          <span className="font-tabular font-medium">{remainingPercentage}% remaining</span>
        </div>

        {/* Progress Bar */}
        <div className="h-2 w-full bg-white/20 rounded-full mt-2.5 overflow-hidden">
          <div 
            className="h-full bg-white rounded-full transition-all duration-500" 
            style={{ width: `${Math.max(4, remainingPercentage)}%` }}
          />
        </div>

        {/* Daily Pacing Footnote */}
        {daysRemaining > 0 && remainingToSpend > 0 && (
          <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-xs opacity-95">
            <span className="flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 opacity-80" />
              <span>{daysRemaining} days remaining</span>
            </span>
            <span className="font-semibold font-tabular">
              ~{formatCurrency(dailyPace, currency)} / day pace
            </span>
          </div>
        )}
      </div>

      {/* Savings Goal Card */}
      <div className="bg-[var(--moku-primary-container)] rounded-[22px] p-5 border border-[var(--moku-primary)]/20 shadow-2xs">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-[var(--moku-primary)] uppercase tracking-wide">
              Savings Goal (Committed First)
            </div>
            <div className="text-lg font-bold text-[var(--moku-text-primary)] mt-0.5 font-tabular">
              {formatCurrency(totalSaved, currency)}{' '}
              <span className="text-xs font-normal text-[var(--moku-text-secondary)]">
                of {formatCurrency(savingsTarget, currency)}
              </span>
            </div>
          </div>

          <button
            id="log-savings-btn"
            type="button"
            onClick={onOpenSavingsModal}
            className="p-2 rounded-xl bg-[var(--moku-primary)] text-white hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
            title="Log savings deposit"
          >
            <ArrowUpRight className="w-5 h-5" />
          </button>
        </div>

        {/* Savings Progress Bar */}
        <div className="h-2 w-full bg-[var(--moku-primary)]/15 rounded-full mt-3 overflow-hidden">
          <div 
            className="h-full bg-[var(--moku-primary)] rounded-full transition-all duration-500" 
            style={{ width: `${Math.max(3, savingsPercentage)}%` }}
          />
        </div>
      </div>

      {/* Plan vs Actual Summary */}
      <PlanVsActual
        plan={plan}
        expenses={expenses}
        monthKey={monthKey}
        currency={currency}
        onOpenPlanWizard={onOpenPlanSetup}
      />

      {/* Mindful Habit Note (Kakeibo Intention) */}
      {plan?.improvementNotes && (
        <div className="p-3.5 rounded-2xl bg-[var(--moku-warning-container)] border border-[var(--moku-warning)]/30 flex items-start space-x-2.5">
          <Sparkles className="w-4 h-4 text-[var(--moku-warning-text)] shrink-0 mt-0.5" />
          <div>
            <span className="text-[11px] font-bold text-[var(--moku-warning-text)] uppercase tracking-wider block">
              Monthly Mindfulness Intention
            </span>
            <p className="text-xs text-[var(--moku-text-primary)] mt-0.5 italic">
              &ldquo;{plan.improvementNotes}&rdquo;
            </p>
          </div>
        </div>
      )}

      {/* PLANNED KAKEIBO CATEGORIES & SECTOR BREAKDOWNS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--moku-text-primary)]">
              Category & Sector Allocations
            </h2>
            <span className="text-xs text-[var(--moku-text-secondary)]">
              Plan vs actual spending breakdown
            </span>
          </div>
          <button
            onClick={onOpenPlanSetup}
            className="text-xs font-bold text-[var(--moku-primary)] hover:underline cursor-pointer"
          >
            Edit plan
          </button>
        </div>

        <div className="space-y-3">
          {(Object.keys(CATEGORIES) as Category[]).map((catKey) => {
            const breakdown = computeCategorySectorBreakdown(plan, expenses, catKey, monthKey);
            const isExpanded = expandedCategories[catKey];

            return (
              <CategoryBudgetCard
                key={catKey}
                category={catKey}
                totalPlanned={breakdown.totalPlanned}
                totalActual={breakdown.totalActual}
                remaining={breakdown.remaining}
                variance={breakdown.variance}
                overallStatus={breakdown.overallStatus}
                sectors={breakdown.sectors}
                currency={currency}
                isExpanded={isExpanded}
                onToggleExpand={() => toggleExpand(catKey)}
              />
            );
          })}
        </div>
      </div>

      {/* Recent Activity List */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--moku-text-primary)]">
            Recent Entries
          </h2>
          <button
            onClick={onOpenQuickAdd}
            className="text-xs font-bold text-[var(--moku-primary)] flex items-center space-x-1 hover:underline cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add expense</span>
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <EmptyState
            icon={<Clock className="w-6 h-6" />}
            title="No expenses recorded this month"
            description="Tap the + button to record a planned or unplanned expense."
            actionLabel="Add Expense"
            onAction={onOpenQuickAdd}
          />
        ) : (
          <div className="space-y-2">
            {recentTransactions.map((tx) => (
              <TransactionItem
                key={tx.id}
                expense={tx}
                currency={currency}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
