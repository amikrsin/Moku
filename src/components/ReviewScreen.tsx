import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, 
  Check, 
  Heart, 
  TrendingUp, 
  CheckCircle2, 
  ChevronDown, 
  BarChart3, 
  PieChart, 
  FileText, 
  Copy, 
  Printer, 
  Flame, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar, 
  Layers, 
  ShieldCheck, 
  Award,
  AlertTriangle
} from 'lucide-react';
import { Category, CATEGORIES, Expense, Plan, SavingsEntry } from '../types';
import { 
  formatCurrency, 
  formatMonthName, 
  computeCategorySectorBreakdown,
  roundMoney,
  getPlanTotalIncome,
  getPlanSavingsTarget,
  getPlanSpendablePool
} from '../lib/storage';
import { StatusBadge } from './ui/StatusBadge';
import { MoneyAmount } from './ui/MoneyAmount';
import { AppCard } from './ui/AppCard';
import { AppButton } from './ui/AppButton';
import { ScreenHeader } from './ui/ScreenHeader';
import { HankoStamp } from './HankoStamp';
import { ExpenseFlowChart } from './ExpenseFlowChart';

interface ReviewScreenProps {
  monthKey: string;
  plan: Plan | null;
  expenses: Expense[];
  savingsEntries?: SavingsEntry[];
  onSaveReflection: (reflectionText: string) => void;
  currency: string;
  onOpenPlanSetup?: () => void;
  allPlans?: Plan[];
  onSelectMonth?: (monthKey: string) => void;
}

type ReportTab = 'overview' | 'flow' | 'ratios';

export function ReviewScreen({
  monthKey,
  plan,
  expenses,
  savingsEntries = [],
  onSaveReflection,
  currency,
  onOpenPlanSetup,
  allPlans = [],
  onSelectMonth,
}: ReviewScreenProps) {
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');
  const [reflectionText, setReflectionText] = useState(plan?.reflection || '');
  const [wentWellText, setWentWellText] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedReportSuccess, setCopiedReportSuccess] = useState(false);

  useEffect(() => {
    if (plan?.reflection) {
      setReflectionText(plan.reflection);
    }
  }, [plan?.reflection]);

  // Active expenses and savings for the selected month
  const activeExpenses = useMemo(() => {
    return expenses.filter((e) => e.monthKey === monthKey && !e.deleted);
  }, [expenses, monthKey]);

  const activeSavings = useMemo(() => {
    return savingsEntries.filter((s) => s.monthKey === monthKey && !s.deleted);
  }, [savingsEntries, monthKey]);

  const totalSpent = useMemo(() => {
    return roundMoney(activeExpenses.reduce((sum, e) => sum + (e.amount || 0), 0));
  }, [activeExpenses]);

  const totalSaved = useMemo(() => {
    return roundMoney(activeSavings.reduce((sum, s) => sum + (s.amount || 0), 0));
  }, [activeSavings]);

  const income = useMemo(() => getPlanTotalIncome(plan), [plan]);
  const savingsTarget = useMemo(() => getPlanSavingsTarget(plan), [plan]);
  const spendableBudget = useMemo(() => getPlanSpendablePool(plan), [plan]);
  const totalVariance = useMemo(() => roundMoney(spendableBudget - totalSpent), [spendableBudget, totalSpent]);

  // Actual Savings Rate (% of total income saved)
  const savingsRate = useMemo(() => {
    if (income <= 0) return 0;
    const effectiveSaved = Math.max(totalSaved, savingsTarget);
    return Math.round((effectiveSaved / income) * 100);
  }, [income, totalSaved, savingsTarget]);

  // Daily pacing & velocity analytics
  const { daysInMonth, daysElapsed, daysRemaining, dailyAverageSpent, remainingDailyAllowance, projectedMonthEnd } = useMemo(() => {
    const [yearStr, monthStr] = monthKey.split('-');
    const planYear = parseInt(yearStr, 10);
    const planMonth = parseInt(monthStr, 10);
    const totalDays = new Date(planYear, planMonth, 0).getDate();

    const now = new Date();
    let elapsed = totalDays;
    let remaining = 0;

    if (now.getFullYear() === planYear && (now.getMonth() + 1) === planMonth) {
      elapsed = Math.max(1, now.getDate());
      remaining = Math.max(0, totalDays - elapsed);
    } else if (now.getFullYear() < planYear || (now.getFullYear() === planYear && (now.getMonth() + 1) < planMonth)) {
      elapsed = 0;
      remaining = totalDays;
    } else {
      elapsed = totalDays;
      remaining = 0;
    }

    const avgSpent = elapsed > 0 ? roundMoney(totalSpent / elapsed) : 0;
    const remainingAllowance = remaining > 0 ? roundMoney(Math.max(0, totalVariance) / remaining) : 0;
    const projected = roundMoney(avgSpent * totalDays);

    return {
      daysInMonth: totalDays,
      daysElapsed: elapsed,
      daysRemaining: remaining,
      dailyAverageSpent: avgSpent,
      remainingDailyAllowance: remainingAllowance,
      projectedMonthEnd: projected,
    };
  }, [monthKey, totalSpent, totalVariance]);

  // Category breakdowns
  const categoryBreakdowns = useMemo(() => {
    return (Object.keys(CATEGORIES) as Category[]).map((catKey) => {
      const breakdown = computeCategorySectorBreakdown(plan, expenses, catKey, monthKey);
      const actualPct = totalSpent > 0 ? Math.round((breakdown.totalActual / totalSpent) * 100) : 0;
      return {
        catKey,
        actualPct,
        ...breakdown,
      };
    });
  }, [plan, expenses, monthKey, totalSpent]);

  // Ideal Kakeibo Benchmark Guideline Ratios
  const KAKEIBO_BENCHMARKS: Record<Category, { label: string; idealPct: number }> = {
    survival: { label: 'Needs (Survival)', idealPct: 50 },
    optional: { label: 'Wants (Optional)', idealPct: 25 },
    culture: { label: 'Culture & Growth', idealPct: 15 },
    extra: { label: 'Unexpected & Extra', idealPct: 10 },
  };

  // Top 5 Highest Outflows this month
  const topOutflows = useMemo(() => {
    return [...activeExpenses]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map((item) => ({
        ...item,
        pct: totalSpent > 0 ? Math.round((item.amount / totalSpent) * 100) : 0,
      }));
  }, [activeExpenses, totalSpent]);

  // Previous Month Comparison (Month-over-Month)
  const previousMonthData = useMemo(() => {
    const [yearStr, monthStr] = monthKey.split('-');
    const prevDate = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 2, 1);
    const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    const prevExpenses = expenses.filter((e) => e.monthKey === prevKey && !e.deleted);
    const prevSpent = roundMoney(prevExpenses.reduce((sum, e) => sum + e.amount, 0));
    const prevPlan = allPlans.find((p) => p.monthKey === prevKey) || null;

    let spendDeltaPct: number | null = null;
    if (prevSpent > 0) {
      spendDeltaPct = Math.round(((totalSpent - prevSpent) / prevSpent) * 100);
    }

    return {
      prevKey,
      prevSpent,
      prevPlan,
      spendDeltaPct,
      hasData: prevExpenses.length > 0 || prevPlan !== null,
    };
  }, [monthKey, expenses, allPlans, totalSpent]);

  // Month navigation options
  const monthOptions = useMemo(() => {
    const set = new Set<string>();
    set.add(monthKey);
    allPlans.forEach((p) => set.add(p.monthKey));
    expenses.forEach((e) => {
      if (e.monthKey) set.add(e.monthKey);
    });
    const d = new Date();
    for (let i = -3; i <= 3; i++) {
      const target = new Date(d.getFullYear(), d.getMonth() + i, 1);
      const key = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}`;
      set.add(key);
    }
    return Array.from(set).sort().reverse();
  }, [allPlans, expenses, monthKey]);

  // Handle Reflection Save
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const combined = [
      wentWellText.trim() ? `What went well: ${wentWellText.trim()}` : '',
      reflectionText.trim() ? `One thing to improve: ${reflectionText.trim()}` : '',
    ].filter(Boolean).join('\n\n');

    onSaveReflection(combined || reflectionText);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Generate and Copy Audit Report to Clipboard
  const handleCopyReport = () => {
    const dateNow = new Date().toLocaleDateString();
    const lines = [
      `=========================================`,
      `  MOKU KAKEIBO FINANCIAL AUDIT REPORT`,
      `  Month: ${formatMonthName(monthKey)}`,
      `  Generated: ${dateNow}`,
      `=========================================`,
      ``,
      `1. CASH INFLOW & BUDGET POOL:`,
      `   - Total Inflow: ${formatCurrency(income, currency)}`,
      `   - Savings Committed: ${formatCurrency(savingsTarget, currency)} (${savingsRate}% rate)`,
      `   - Spendable Budget: ${formatCurrency(spendableBudget, currency)}`,
      ``,
      `2. ACTUAL OUTFLOWS & VARIANCE:`,
      `   - Total Spending: ${formatCurrency(totalSpent, currency)}`,
      `   - Net Margin: ${totalVariance >= 0 ? '+' : ''}${formatCurrency(totalVariance, currency)} (${totalVariance >= 0 ? 'Surplus' : 'Deficit'})`,
      `   - Daily Average Burn: ${formatCurrency(dailyAverageSpent, currency)}/day`,
      ``,
      `3. KAKEIBO 4-PILLAR BREAKDOWN:`,
      ...categoryBreakdowns.map((b) => {
        const cat = CATEGORIES[b.catKey];
        const ideal = KAKEIBO_BENCHMARKS[b.catKey].idealPct;
        return `   - ${cat.name} (${cat.subhead}): ${formatCurrency(b.totalActual, currency)} / Plan ${formatCurrency(b.totalPlanned, currency)} (${b.actualPct}% of total, Ideal ~${ideal}%)`;
      }),
      ``,
      `4. TOP OUTFLOW ITEMS:`,
      ...topOutflows.map((item, idx) => `   ${idx + 1}. ${item.note}: ${formatCurrency(item.amount, currency)} (${item.pct}%)`),
      ``,
      `5. KAIZEN REFLECTION & ACTION:`,
      `   "${plan?.reflection || 'No reflection recorded yet.'}"`,
      ``,
      `=========================================`,
      `Audited with MOKU Kakeibo Japanese Ledger`,
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedReportSuccess(true);
    setTimeout(() => setCopiedReportSuccess(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 pb-12 animate-in fade-in duration-200">
      {/* Top Header & Month Selector */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <ScreenHeader
            subtitle="Kakeibo Review & Financial Audit"
            title={formatMonthName(monthKey)}
          />
        </div>

        {onSelectMonth && (
          <div className="relative inline-flex items-center">
            <select
              id="report-month-select"
              value={monthKey}
              onChange={(e) => onSelectMonth(e.target.value)}
              className="appearance-none bg-[var(--moku-surface-secondary)] text-[var(--moku-text-primary)] text-xs font-semibold py-1.5 pl-3 pr-7 rounded-xl border border-[var(--moku-outline)] outline-none cursor-pointer hover:border-[var(--moku-primary)] transition-colors shadow-2xs"
            >
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {formatMonthName(m)}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--moku-text-secondary)] absolute right-2 pointer-events-none" />
          </div>
        )}
      </div>

      {/* Segmented Sub-view Navigation */}
      <div className="flex items-center p-1 rounded-2xl bg-[var(--moku-surface-secondary)] border border-[var(--moku-outline)]">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-[var(--moku-surface)] text-[var(--moku-primary)] shadow-2xs'
              : 'text-[var(--moku-text-secondary)] hover:text-[var(--moku-text-primary)]'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Overview &amp; Kaizen</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('flow')}
          className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
            activeTab === 'flow'
              ? 'bg-[var(--moku-surface)] text-[var(--moku-primary)] shadow-2xs'
              : 'text-[var(--moku-text-secondary)] hover:text-[var(--moku-text-primary)]'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Daily Flow &amp; Charts</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ratios')}
          className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
            activeTab === 'ratios'
              ? 'bg-[var(--moku-surface)] text-[var(--moku-primary)] shadow-2xs'
              : 'text-[var(--moku-text-secondary)] hover:text-[var(--moku-text-primary)]'
          }`}
        >
          <PieChart className="w-3.5 h-3.5" />
          <span>Ratios &amp; Audit</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & KAIZEN */}
      {activeTab === 'overview' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* 4 Core Kakeibo Foundation Cards */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Q1: Available Inflow */}
            <AppCard padding="md">
              <span className="text-[11px] font-semibold text-[var(--moku-text-secondary)] block">
                1. Total Inflow
              </span>
              <div className="mt-1">
                <MoneyAmount amount={income} currency={currency} size="lg" weight="bold" />
              </div>
              <span className="text-[10px] text-[var(--moku-text-secondary)]">
                Income &amp; carryover
              </span>
            </AppCard>

            {/* Q2: Committed Savings & Rate */}
            <div className="p-3.5 rounded-[22px] bg-[var(--moku-primary-container)] border border-[var(--moku-primary)]/20 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[var(--moku-primary)]">
                  2. Savings Target
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--moku-surface)] text-[var(--moku-primary)] border border-[var(--moku-primary)]/30 font-tabular">
                  {savingsRate}% saved
                </span>
              </div>
              <div className="mt-1">
                <MoneyAmount amount={savingsTarget} currency={currency} size="lg" weight="bold" color="primary" />
              </div>
              <span className="text-[10px] text-[var(--moku-primary)] opacity-90 block">
                {savingsRate >= 20 ? '✓ Exceeds 20% rule' : 'Paid to self first'}
              </span>
            </div>

            {/* Q3: Spendable & Actual Spent */}
            <AppCard padding="md">
              <span className="text-[11px] font-semibold text-[var(--moku-text-secondary)] block">
                3. Actual Spent
              </span>
              <div className="mt-1">
                <MoneyAmount amount={totalSpent} currency={currency} size="lg" weight="bold" />
              </div>
              <span className="text-[10px] text-[var(--moku-text-secondary)]">
                of {formatCurrency(spendableBudget, currency)} pool
              </span>
            </AppCard>

            {/* Q4: Net Margin / Buffer */}
            <AppCard padding="md">
              <span className="text-[11px] font-semibold text-[var(--moku-text-secondary)] block">
                4. Net Surplus / Deficit
              </span>
              <div className="mt-1">
                <MoneyAmount 
                  amount={Math.abs(totalVariance)} 
                  currency={currency} 
                  size="lg" 
                  weight="bold" 
                  color={totalVariance >= 0 ? 'primary' : 'danger'}
                />
              </div>
              <span className="text-[10px] text-[var(--moku-text-secondary)] font-medium">
                {totalVariance >= 0 
                  ? `+${formatCurrency(totalVariance, currency)} safe buffer` 
                  : `-${formatCurrency(Math.abs(totalVariance), currency)} over plan`}
              </span>
            </AppCard>
          </div>

          {/* Daily Burn Rate & Velocity Bar */}
          <AppCard padding="md" className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-[var(--moku-text-primary)]">
                <Flame className="w-4 h-4 text-amber-500" />
                <span>Daily Spending Velocity &amp; Burn Rate</span>
              </div>
              <span className="text-[10px] font-semibold text-[var(--moku-text-secondary)]">
                {daysElapsed} of {daysInMonth} days
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="p-2 rounded-xl bg-[var(--moku-surface-secondary)] text-center">
                <span className="text-[10px] text-[var(--moku-text-secondary)] block">Avg Daily Burn</span>
                <span className="text-xs font-bold text-[var(--moku-text-primary)] font-tabular">
                  {formatCurrency(dailyAverageSpent, currency)}
                </span>
              </div>

              <div className="p-2 rounded-xl bg-[var(--moku-surface-secondary)] text-center">
                <span className="text-[10px] text-[var(--moku-text-secondary)] block">Safe Daily Limit</span>
                <span className="text-xs font-bold text-[var(--moku-primary)] font-tabular">
                  {daysRemaining > 0 ? formatCurrency(remainingDailyAllowance, currency) : 'Month ended'}
                </span>
              </div>

              <div className="p-2 rounded-xl bg-[var(--moku-surface-secondary)] text-center">
                <span className="text-[10px] text-[var(--moku-text-secondary)] block">Projected Total</span>
                <span className={`text-xs font-bold font-tabular ${projectedMonthEnd > spendableBudget ? 'text-[var(--moku-danger)]' : 'text-[var(--moku-text-primary)]'}`}>
                  {formatCurrency(projectedMonthEnd, currency)}
                </span>
              </div>
            </div>
          </AppCard>

          {/* 4 Pillars Performance */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[var(--moku-text-primary)]">
                Pillars Budget vs Actual
              </h2>
              <span className="text-[11px] text-[var(--moku-text-secondary)]">
                4 Kakeibo channels
              </span>
            </div>

            <div className="space-y-2">
              {categoryBreakdowns.map((item) => {
                const cat = CATEGORIES[item.catKey];
                const pctOfBudget = item.totalPlanned > 0 ? Math.round((item.totalActual / item.totalPlanned) * 100) : 0;
                return (
                  <AppCard key={item.catKey} padding="md" className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-xl">{cat.icon}</span>
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="text-xs font-bold text-[var(--moku-text-primary)]">
                              {cat.name}
                            </span>
                            <span className="text-[10px] text-[var(--moku-text-secondary)]">
                              ({cat.subhead})
                            </span>
                          </div>
                          <span className="text-[10px] text-[var(--moku-text-secondary)]">
                            {item.sectors.length} planned sector{item.sectors.length === 1 ? '' : 's'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <MoneyAmount amount={item.totalActual} currency={currency} size="sm" weight="bold" />
                        <span className="text-[10px] text-[var(--moku-text-secondary)] block">
                          of {formatCurrency(item.totalPlanned, currency)} ({pctOfBudget}%)
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-1.5 w-full bg-[var(--moku-surface-secondary)] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          item.overallStatus === 'OVER_PLAN'
                            ? 'bg-[var(--moku-danger)]'
                            : item.overallStatus === 'WATCH'
                            ? 'bg-[var(--moku-warning)]'
                            : 'bg-[var(--moku-primary)]'
                        }`}
                        style={{
                          width: `${item.totalPlanned > 0 ? Math.min(100, (item.totalActual / item.totalPlanned) * 100) : 0}%`,
                        }}
                      />
                    </div>

                    {/* Sector Pills */}
                    {item.sectors.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {item.sectors.map((sec) => (
                          <div
                            key={sec.id}
                            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-[var(--moku-surface-secondary)] text-[10px] text-[var(--moku-text-primary)]"
                          >
                            <span>{sec.name}:</span>
                            <StatusBadge status={sec.status} />
                          </div>
                        ))}
                      </div>
                    )}
                  </AppCard>
                );
              })}
            </div>
          </div>

          {/* Monthly Kaizen Reflection Form */}
          <AppCard padding="lg" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Heart className="w-5 h-5 text-[var(--moku-primary)]" />
                <h2 className="text-base font-bold text-[var(--moku-text-primary)]">
                  Reflect &amp; Improve (Kaizen)
                </h2>
              </div>
              {plan?.reflection && (
                <div className="shrink-0">
                  <HankoStamp text="REVIEWED" size="sm" />
                </div>
              )}
            </div>

            {!plan ? (
              <div className="p-4 rounded-xl bg-[var(--moku-surface-secondary)] border border-[var(--moku-outline)] space-y-3">
                <p className="text-xs text-[var(--moku-text-secondary)] leading-relaxed">
                  To complete and save your Kaizen reflection for {formatMonthName(monthKey)}, please set up your plan first.
                </p>
                {onOpenPlanSetup && (
                  <AppButton
                    type="button"
                    size="sm"
                    onClick={onOpenPlanSetup}
                    icon={<Sparkles className="w-3.5 h-3.5" />}
                  >
                    Begin {formatMonthName(monthKey)} Plan
                  </AppButton>
                )}
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--moku-text-secondary)] uppercase tracking-wider mb-1">
                    What went well with your money this month?
                  </label>
                  <textarea
                    value={wentWellText}
                    onChange={(e) => setWentWellText(e.target.value)}
                    placeholder="e.g. Stuck to pantry cooking, didn't make impulse online purchases..."
                    rows={2}
                    className="w-full p-3 rounded-xl border border-[var(--moku-outline)] bg-[var(--moku-surface-secondary)] text-xs text-[var(--moku-text-primary)] outline-none resize-none focus:border-[var(--moku-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--moku-text-secondary)] uppercase tracking-wider mb-1">
                    One adjustment for next month?
                  </label>
                  <textarea
                    value={reflectionText}
                    onChange={(e) => setReflectionText(e.target.value)}
                    placeholder="e.g. Set a strict weekend takeout cap, review recurring app subscriptions..."
                    rows={3}
                    className="w-full p-3 rounded-xl border border-[var(--moku-outline)] bg-[var(--moku-surface-secondary)] text-xs text-[var(--moku-text-primary)] outline-none resize-none focus:border-[var(--moku-primary)]"
                  />
                </div>

                <div className="pt-1 flex items-center justify-between">
                  {savedSuccess ? (
                    <span className="text-xs font-bold text-[var(--moku-primary)] flex items-center space-x-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Reflection stamped &amp; saved</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-[var(--moku-text-secondary)]">
                      Private, offline-first ledger
                    </span>
                  )}

                  <AppButton
                    type="submit"
                    size="md"
                    icon={<Sparkles className="w-3.5 h-3.5" />}
                  >
                    Stamp Reflection
                  </AppButton>
                </div>
              </form>
            )}
          </AppCard>
        </div>
      )}

      {/* TAB 2: DAILY FLOW & CHARTS */}
      {activeTab === 'flow' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <ExpenseFlowChart
            monthKey={monthKey}
            expenses={expenses}
            plan={plan}
            currency={currency}
          />
        </div>
      )}

      {/* TAB 3: RATIOS & AUDIT REPORT */}
      {activeTab === 'ratios' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Kakeibo Pillar Allocation vs Traditional Japanese Ideal Benchmark */}
          <AppCard padding="lg" className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[var(--moku-text-primary)]">
                  Kakeibo Pillar Allocation vs Benchmark
                </h3>
                <p className="text-[11px] text-[var(--moku-text-secondary)]">
                  Traditional Japanese Kakeibo recommended balance
                </p>
              </div>
              <ShieldCheck className="w-5 h-5 text-[var(--moku-primary)]" />
            </div>

            {/* Visual Stacked Proportional Bar */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[var(--moku-text-secondary)] uppercase tracking-wider">
                Actual Spending Distribution
              </span>
              <div className="h-4 w-full rounded-xl overflow-hidden flex bg-[var(--moku-surface-secondary)] border border-[var(--moku-outline)]">
                {categoryBreakdowns.map((cat) => {
                  const info = CATEGORIES[cat.catKey];
                  if (cat.actualPct <= 0) return null;
                  return (
                    <div
                      key={cat.catKey}
                      style={{ width: `${cat.actualPct}%`, backgroundColor: info.color }}
                      className="h-full relative group transition-all duration-300"
                      title={`${info.name}: ${cat.actualPct}%`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Comparative Breakdown Table */}
            <div className="space-y-2 pt-1">
              {categoryBreakdowns.map((item) => {
                const cat = CATEGORIES[item.catKey];
                const ideal = KAKEIBO_BENCHMARKS[item.catKey].idealPct;
                const diff = item.actualPct - ideal;
                return (
                  <div key={item.catKey} className="p-2.5 rounded-xl bg-[var(--moku-surface-secondary)] flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-base">{cat.icon}</span>
                      <div>
                        <span className="text-xs font-bold text-[var(--moku-text-primary)] block">
                          {cat.name} ({cat.subhead})
                        </span>
                        <span className="text-[10px] text-[var(--moku-text-secondary)]">
                          Ideal Target: ~{ideal}%
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-[var(--moku-text-primary)] font-tabular block">
                        {formatCurrency(item.totalActual, currency)} ({item.actualPct}%)
                      </span>
                      <span className={`text-[10px] font-semibold font-tabular ${
                        diff > 5 ? 'text-[var(--moku-danger)]' : diff < -5 ? 'text-blue-500' : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {diff > 0 ? `+${diff}% vs target` : diff < 0 ? `${diff}% vs target` : 'Balanced'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </AppCard>

          {/* Top 5 Outflow Drivers */}
          <AppCard padding="lg" className="space-y-3">
            <h3 className="text-sm font-bold text-[var(--moku-text-primary)] flex items-center space-x-1.5">
              <Layers className="w-4 h-4 text-[var(--moku-primary)]" />
              <span>Top 5 Outflow Drivers This Month</span>
            </h3>

            {topOutflows.length === 0 ? (
              <p className="text-xs text-[var(--moku-text-secondary)] italic">
                No expenses logged for {formatMonthName(monthKey)} yet.
              </p>
            ) : (
              <div className="space-y-2">
                {topOutflows.map((item, index) => (
                  <div key={item.id} className="p-2.5 rounded-xl bg-[var(--moku-surface-secondary)] flex items-center justify-between">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-[var(--moku-surface)] border border-[var(--moku-outline)] flex items-center justify-center text-[10px] font-bold text-[var(--moku-text-secondary)] shrink-0">
                        {index + 1}
                      </span>
                      <div className="truncate">
                        <span className="text-xs font-bold text-[var(--moku-text-primary)] block truncate">
                          {item.note}
                        </span>
                        <span className="text-[10px] text-[var(--moku-text-secondary)]">
                          {CATEGORIES[item.category].name} {item.sectorName ? `· ${item.sectorName}` : ''}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-2">
                      <span className="text-xs font-bold text-[var(--moku-text-primary)] font-tabular block">
                        {formatCurrency(item.amount, currency)}
                      </span>
                      <span className="text-[10px] text-[var(--moku-text-secondary)] font-tabular">
                        {item.pct}% of monthly spend
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AppCard>

          {/* Month-over-Month Comparative Trends */}
          {previousMonthData.hasData && (
            <AppCard padding="md" className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--moku-text-primary)]">
                  Month-over-Month Trend
                </span>
                <span className="text-[10px] text-[var(--moku-text-secondary)]">
                  vs {formatMonthName(previousMonthData.prevKey)}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--moku-surface-secondary)]">
                <div>
                  <span className="text-[10px] text-[var(--moku-text-secondary)] block">
                    Prior Month Spend
                  </span>
                  <span className="text-xs font-bold text-[var(--moku-text-primary)] font-tabular">
                    {formatCurrency(previousMonthData.prevSpent, currency)}
                  </span>
                </div>

                {previousMonthData.spendDeltaPct !== null && (
                  <div className={`flex items-center space-x-1 px-2.5 py-1 rounded-xl text-xs font-bold font-tabular ${
                    previousMonthData.spendDeltaPct > 0
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40'
                  }`}>
                    {previousMonthData.spendDeltaPct > 0 ? (
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowDownRight className="w-3.5 h-3.5" />
                    )}
                    <span>{Math.abs(previousMonthData.spendDeltaPct)}% spending {previousMonthData.spendDeltaPct > 0 ? 'increase' : 'decrease'}</span>
                  </div>
                )}
              </div>
            </AppCard>
          )}

          {/* Downloadable / Shareable Monthly Audit Summary Generator */}
          <AppCard padding="lg" className="space-y-3 bg-[var(--moku-primary-container)]/30 border border-[var(--moku-primary)]/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-[var(--moku-primary)]" />
                <div>
                  <h3 className="text-sm font-bold text-[var(--moku-text-primary)]">
                    Shareable Audit Summary
                  </h3>
                  <p className="text-[11px] text-[var(--moku-text-secondary)]">
                    Export clean financial report for personal journal or records
                  </p>
                </div>
              </div>

              <HankoStamp text="VERIFIED" size="sm" />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyReport}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[var(--moku-surface)] border border-[var(--moku-outline)] hover:border-[var(--moku-primary)] text-xs font-bold text-[var(--moku-text-primary)] transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-2xs"
              >
                <Copy className="w-3.5 h-3.5 text-[var(--moku-primary)]" />
                <span>{copiedReportSuccess ? '✓ Copied to Clipboard!' : 'Copy Formatted Report'}</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="py-2.5 px-3 rounded-xl bg-[var(--moku-surface)] border border-[var(--moku-outline)] hover:border-[var(--moku-primary)] text-xs font-bold text-[var(--moku-text-primary)] transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-2xs"
                title="Print report preview"
              >
                <Printer className="w-3.5 h-3.5 text-[var(--moku-text-secondary)]" />
                <span>Print</span>
              </button>
            </div>
          </AppCard>
        </div>
      )}
    </div>
  );
}
