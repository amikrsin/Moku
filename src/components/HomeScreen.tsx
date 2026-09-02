import React, { useState, useMemo } from 'react';
import { 
  ChevronDown, 
  ChevronUp,
  Moon, 
  Sun, 
  ArrowUpRight, 
  TrendingUp, 
  PlusCircle, 
  Clock, 
  Layers,
  Inbox,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Compass
} from 'lucide-react';
import { Expense, Plan, SavingsEntry, UserProfile, CATEGORIES, Category, BudgetSignal } from '../types';
import { formatCurrency, formatMonthName, computeCategorySectorBreakdown } from '../lib/storage';

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

  const income = plan?.income || 50000;
  const savingsTarget = plan?.savingsTarget || 10000;
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

  // Status badge styling helper
  const renderSignalBadge = (status: BudgetSignal) => {
    switch (status) {
      case 'ON_TRACK':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D8F3E7] dark:bg-[#214C3D] text-[#176B52] dark:text-[#82D9B4]">
            ON TRACK
          </span>
        );
      case 'PAID':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
            PAID
          </span>
        );
      case 'WATCH':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
            WATCH
          </span>
        );
      case 'OVER_PLAN':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300">
            OVER PLAN
          </span>
        );
      case 'UNPLANNED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300">
            UNPLANNED
          </span>
        );
      case 'NOT_STARTED':
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EEF1EE] dark:bg-[#2B312B] text-[#6E736F] dark:text-[#C1C7C0]">
            NOT STARTED
          </span>
        );
    }
  };

  return (
    <div className="space-y-5 pb-8 animate-in fade-in duration-200">
      {/* Top Bar: Month Selector & Theme Toggle */}
      <div className="flex items-center justify-between pt-1">
        <div className="relative inline-flex items-center">
          <select
            id="home-month-select"
            value={monthKey}
            onChange={(e) => onChangeMonth(e.target.value)}
            className="appearance-none bg-[#EEF1EE] dark:bg-[#252925] text-[#1A1C1A] dark:text-[#E3E5E1] text-xs font-semibold py-2 pl-3.5 pr-8 rounded-xl border border-[#DDE2DD] dark:border-[#414842] outline-none cursor-pointer hover:border-[#176B52] transition-colors"
          >
            {monthOptions.map((m) => (
              <option key={m} value={m}>
                {formatMonthName(m)}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#6E736F] dark:text-[#C1C7C0] absolute right-2.5 pointer-events-none" />
        </div>

        <div className="flex items-center space-x-2">
          {inboxPendingCount > 0 && (
            <button
              onClick={onOpenInbox}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#D8F3E7] dark:bg-[#214C3D] text-[#176B52] dark:text-[#82D9B4] text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>{inboxPendingCount} pending</span>
            </button>
          )}

          <button
            id="theme-toggle-btn"
            type="button"
            onClick={onToggleDarkMode}
            className="p-2 rounded-xl bg-[#EEF1EE] dark:bg-[#252925] text-[#1A1C1A] dark:text-[#E3E5E1] border border-[#DDE2DD] dark:border-[#414842] hover:bg-[#DDE2DD] dark:hover:bg-[#343B35] transition-colors cursor-pointer"
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-[#82D9B4]" /> : <Moon className="w-4 h-4 text-[#176B52]" />}
          </button>
        </div>
      </div>

      {/* Greeting & Headline */}
      <div>
        <div className="text-xs font-medium text-[#6E736F] dark:text-[#C1C7C0] tracking-wide">
          {greeting}
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1C1A] dark:text-[#E3E5E1] mt-0.5">
          Here&apos;s your money this month.
        </h1>
      </div>

      {/* HERO CARD: Available to Spend */}
      <div className="bg-[#176B52] dark:bg-[#1B382D] text-white rounded-[24px] p-6 shadow-lg shadow-[#176B52]/10 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between">
          <div className="text-xs font-bold tracking-wider uppercase text-white/75">
            Available to spend
          </div>
          <button
            onClick={onOpenPlanSetup}
            className="text-[11px] font-semibold text-[#82D9B4] hover:underline cursor-pointer"
          >
            {plan ? 'Adjust plan ›' : 'Set monthly plan ›'}
          </button>
        </div>

        <div className="text-4xl sm:text-5xl font-extrabold tracking-tight font-tabular my-3">
          {formatCurrency(remainingToSpend, currency)}
        </div>

        <div className="flex items-center justify-between text-xs text-white/85 pt-1">
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
          <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-xs text-white/90">
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
      <div className="bg-[#D8F3E7] dark:bg-[#214C3D] rounded-[22px] p-5 border border-[#176B52]/15 dark:border-[#82D9B4]/20 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-[#176B52] dark:text-[#82D9B4] uppercase tracking-wide">
              Savings Goal (Committed First)
            </div>
            <div className="text-lg font-bold text-[#1A1C1A] dark:text-[#E3E5E1] mt-0.5 font-tabular">
              {formatCurrency(totalSaved, currency)}{' '}
              <span className="text-xs font-normal text-[#6E736F] dark:text-[#C1C7C0]">
                of {formatCurrency(savingsTarget, currency)}
              </span>
            </div>
          </div>

          <button
            id="log-savings-btn"
            type="button"
            onClick={onOpenSavingsModal}
            className="p-2 rounded-xl bg-[#176B52] text-white dark:bg-[#82D9B4] dark:text-[#121412] hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
            title="Log savings deposit"
          >
            <ArrowUpRight className="w-5 h-5" />
          </button>
        </div>

        {/* Savings Progress Bar */}
        <div className="h-2 w-full bg-[#176B52]/15 dark:bg-white/15 rounded-full mt-3 overflow-hidden">
          <div 
            className="h-full bg-[#176B52] dark:bg-[#82D9B4] rounded-full transition-all duration-500" 
            style={{ width: `${Math.max(3, savingsPercentage)}%` }}
          />
        </div>
      </div>

      {/* Mindful Habit Note (Kakeibo Intention) */}
      {plan?.improvementNotes && (
        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 flex items-start space-x-2.5">
          <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider block">
              Monthly Mindfulness Intention
            </span>
            <p className="text-xs text-[#1A1C1A] dark:text-[#E3E5E1] mt-0.5 italic">
              &ldquo;{plan.improvementNotes}&rdquo;
            </p>
          </div>
        </div>
      )}

      {/* PLANNED KAKEIBO CATEGORIES & SECTOR BREAKDOWNS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#1A1C1A] dark:text-[#E3E5E1]">
              Category & Sector Allocations
            </h2>
            <span className="text-xs text-[#6E736F] dark:text-[#C1C7C0]">
              Plan vs actual spending breakdown
            </span>
          </div>
          <button
            onClick={onOpenPlanSetup}
            className="text-xs font-bold text-[#176B52] dark:text-[#82D9B4] hover:underline"
          >
            Edit plan
          </button>
        </div>

        <div className="space-y-3">
          {(Object.keys(CATEGORIES) as Category[]).map((catKey) => {
            const cat = CATEGORIES[catKey];
            const breakdown = computeCategorySectorBreakdown(plan, expenses, catKey, monthKey);
            const isExpanded = expandedCategories[catKey];
            const pct = breakdown.totalPlanned > 0 
              ? Math.min(100, Math.round((breakdown.totalActual / breakdown.totalPlanned) * 100)) 
              : 0;

            return (
              <div
                key={catKey}
                className="bg-white dark:bg-[#1B1E1B] border border-[#DDE2DD] dark:border-[#414842] rounded-[22px] overflow-hidden shadow-xs"
              >
                {/* Category Header Bar */}
                <div 
                  onClick={() => toggleExpand(catKey)}
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#F7F8F7] dark:hover:bg-[#252925] transition-colors"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <span className="text-2xl shrink-0">{cat.icon}</span>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-[#1A1C1A] dark:text-[#E3E5E1]">
                          {cat.name}
                        </span>
                        {renderSignalBadge(breakdown.overallStatus)}
                      </div>
                      <div className="text-xs text-[#6E736F] dark:text-[#C1C7C0] mt-0.5">
                        <span className="font-bold font-tabular text-[#1A1C1A] dark:text-[#E3E5E1]">
                          {formatCurrency(breakdown.totalActual, currency)}
                        </span>
                        <span> of {formatCurrency(breakdown.totalPlanned, currency)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0">
                    <div className="text-right">
                      <span className="text-xs font-bold font-tabular text-[#176B52] dark:text-[#82D9B4] block">
                        {pct}%
                      </span>
                      <span className="text-[10px] text-[#6E736F] dark:text-[#C1C7C0]">
                        {formatCurrency(breakdown.remaining, currency)} left
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-[#6E736F]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#6E736F]" />
                    )}
                  </div>
                </div>

                {/* Progress bar across category */}
                <div className="h-1.5 w-full bg-[#EEF1EE] dark:bg-[#2B312B]">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      breakdown.overallStatus === 'OVER_PLAN' 
                        ? 'bg-rose-500' 
                        : breakdown.overallStatus === 'WATCH' 
                        ? 'bg-amber-500' 
                        : 'bg-[#176B52] dark:bg-[#82D9B4]'
                    }`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>

                {/* Expanded Individual Planned Expense Sectors */}
                {isExpanded && (
                  <div className="p-3.5 bg-[#F7F8F7] dark:bg-[#222722] border-t border-[#DDE2DD] dark:border-[#414842] space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#6E736F] dark:text-[#C1C7C0] px-1 mb-1">
                      Planned Sectors in {cat.name}
                    </div>

                    {breakdown.sectors.map((sec) => (
                      <div
                        key={sec.id}
                        className="p-2.5 rounded-xl bg-white dark:bg-[#1B1E1B] border border-[#DDE2DD] dark:border-[#414842] flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <span className="text-base shrink-0">{sec.icon || '📌'}</span>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-[#1A1C1A] dark:text-[#E3E5E1] truncate">
                                {sec.name}
                              </span>
                              {renderSignalBadge(sec.status)}
                            </div>
                            <div className="text-[11px] text-[#6E736F] dark:text-[#C1C7C0] mt-0.5">
                              {sec.isUnplanned ? (
                                <span className="text-purple-600 dark:text-purple-400 font-semibold">Unplanned expense</span>
                              ) : (
                                <span>Plan: {formatCurrency(sec.plannedAmount, currency)}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0 pl-2">
                          <strong className="text-xs font-bold text-[#1A1C1A] dark:text-[#E3E5E1] font-tabular block">
                            {formatCurrency(sec.actualAmount, currency)}
                          </strong>
                          {!sec.isUnplanned && (
                            <span className={`text-[10px] font-tabular ${sec.variance > 0 ? 'text-rose-600 font-bold' : 'text-[#6E736F]'}`}>
                              {sec.variance > 0 
                                ? `+${formatCurrency(sec.variance, currency)}` 
                                : `${formatCurrency(sec.remainingAmount, currency)} left`}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Activity List */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#1A1C1A] dark:text-[#E3E5E1]">
            Recent Entries
          </h2>
          <button
            onClick={onOpenQuickAdd}
            className="text-xs font-bold text-[#176B52] dark:text-[#82D9B4] flex items-center space-x-1 hover:underline cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add expense</span>
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="bg-white dark:bg-[#1B1E1B] border border-[#DDE2DD] dark:border-[#414842] rounded-[24px] p-8 text-center">
            <Clock className="w-8 h-8 text-[#6E736F] mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium text-[#1A1C1A] dark:text-[#E3E5E1]">
              No expenses recorded this month
            </p>
            <p className="text-xs text-[#6E736F] dark:text-[#C1C7C0] mt-1">
              Tap the center + button to add a planned or unplanned expense
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#1B1E1B] border border-[#DDE2DD] dark:border-[#414842] rounded-[24px] overflow-hidden shadow-xs divide-y divide-[#DDE2DD] dark:divide-[#414842]">
            {recentTransactions.map((tx) => {
              const cat = CATEGORIES[tx.category] || CATEGORIES.survival;
              const dateObj = tx.date ? new Date(tx.date) : new Date(tx.createdAt);
              const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

              return (
                <div 
                  key={tx.id}
                  className="p-4 flex items-center justify-between hover:bg-[#F7F8F7] dark:hover:bg-[#252925] transition-colors"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#EEF1EE] dark:bg-[#252925] flex items-center justify-center text-lg shrink-0">
                      {cat.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-[#1A1C1A] dark:text-[#E3E5E1] truncate">
                        {tx.note || cat.name}
                      </div>
                      <div className="text-xs text-[#6E736F] dark:text-[#C1C7C0] flex items-center space-x-1.5 mt-0.5">
                        <span className="font-medium">{cat.name}</span>
                        {tx.sectorName && (
                          <>
                            <span>•</span>
                            <span className="px-1.5 py-0.5 rounded-md bg-[#EEF1EE] dark:bg-[#2B312B] text-[10px] font-bold text-[#176B52] dark:text-[#82D9B4]">
                              {tx.sectorName}
                            </span>
                          </>
                        )}
                        <span>•</span>
                        <span>{formattedDate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 pl-3">
                    <div className="text-sm sm:text-base font-bold text-[#1A1C1A] dark:text-[#E3E5E1] font-tabular">
                      −{formatCurrency(tx.amount, currency)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
