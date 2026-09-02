import React, { useState, useEffect } from 'react';
import { Sparkles, Check, Heart, TrendingUp, CheckCircle2 } from 'lucide-react';
import { Category, CATEGORIES, Expense, Plan } from '../types';
import { formatCurrency, formatMonthName, computeCategorySectorBreakdown } from '../lib/storage';
import { StatusBadge } from './ui/StatusBadge';
import { MoneyAmount } from './ui/MoneyAmount';
import { AppCard } from './ui/AppCard';
import { AppButton } from './ui/AppButton';
import { ScreenHeader } from './ui/ScreenHeader';

interface ReviewScreenProps {
  monthKey: string;
  plan: Plan | null;
  expenses: Expense[];
  onSaveReflection: (reflectionText: string) => void;
  currency: string;
}

export function ReviewScreen({
  monthKey,
  plan,
  expenses,
  onSaveReflection,
  currency,
}: ReviewScreenProps) {
  const [reflectionText, setReflectionText] = useState(plan?.reflection || '');
  const [wentWellText, setWentWellText] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (plan?.reflection) {
      setReflectionText(plan.reflection);
    }
  }, [plan?.reflection]);

  const activeExpenses = expenses.filter((e) => e.monthKey === monthKey && !e.deleted);
  const totalSpent = activeExpenses.reduce((sum, e) => sum + e.amount, 0);

  const income = plan ? (plan.income ?? 0) : 0;
  const savingsTarget = plan ? (plan.savingsTarget ?? 0) : 0;
  const spendableBudget = Math.max(0, income - savingsTarget);
  const totalVariance = spendableBudget - totalSpent;

  // Breakdown across all 4 categories
  const categoryBreakdowns = (Object.keys(CATEGORIES) as Category[]).map(catKey => {
    return {
      catKey,
      ...computeCategorySectorBreakdown(plan, expenses, catKey, monthKey),
    };
  });

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

  return (
    <div className="space-y-5 pb-8 animate-in fade-in duration-200">
      {/* Top Header */}
      <ScreenHeader
        subtitle={`${formatMonthName(monthKey)} · Reflection & Review`}
        title="Monthly Review"
      />

      {/* 4 Core Kakeibo Review Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Q1: Available Pool */}
        <AppCard padding="md">
          <span className="text-[11px] font-semibold text-[var(--moku-text-secondary)] block">
            1. Available Money
          </span>
          <div className="mt-1">
            <MoneyAmount amount={income} currency={currency} size="lg" weight="bold" />
          </div>
          <span className="text-[10px] text-[var(--moku-text-secondary)]">
            Inflows &amp; carryover
          </span>
        </AppCard>

        {/* Q2: Target Savings */}
        <div className="p-4 rounded-[22px] bg-[var(--moku-primary-container)] border border-[var(--moku-primary)]/20 shadow-2xs">
          <span className="text-[11px] font-semibold text-[var(--moku-primary)] block">
            2. Committed Savings
          </span>
          <div className="mt-1">
            <MoneyAmount amount={savingsTarget} currency={currency} size="lg" weight="bold" color="primary" />
          </div>
          <span className="text-[10px] text-[var(--moku-primary)] opacity-80">
            Paid to self first
          </span>
        </div>

        {/* Q3: Spendable & Actual */}
        <AppCard padding="md">
          <span className="text-[11px] font-semibold text-[var(--moku-text-secondary)] block">
            3. Actual Spent
          </span>
          <div className="mt-1">
            <MoneyAmount amount={totalSpent} currency={currency} size="lg" weight="bold" />
          </div>
          <span className="text-[10px] text-[var(--moku-text-secondary)]">
            of {formatCurrency(spendableBudget, currency)} plan
          </span>
        </AppCard>

        {/* Q4: Net Margin / Buffer */}
        <AppCard padding="md">
          <span className="text-[11px] font-semibold text-[var(--moku-text-secondary)] block">
            4. Net Margin
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
          <span className="text-[10px] text-[var(--moku-text-secondary)]">
            {totalVariance >= 0 ? 'Surplus maintained' : 'Exceeded plan'}
          </span>
        </AppCard>
      </div>

      {/* Category Performance Breakdown */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-[var(--moku-text-primary)]">
          Pillars Performance
        </h2>

        <div className="space-y-2.5">
          {categoryBreakdowns.map((item) => {
            const cat = CATEGORIES[item.catKey];
            return (
              <AppCard key={item.catKey} padding="md" className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">{cat.icon}</span>
                    <div>
                      <span className="text-xs font-bold text-[var(--moku-text-primary)] block">
                        {cat.name}
                      </span>
                      <span className="text-[10px] text-[var(--moku-text-secondary)]">
                        {item.sectors.length} planned sector{item.sectors.length === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <MoneyAmount amount={item.totalActual} currency={currency} size="sm" weight="bold" />
                    <span className="text-[10px] text-[var(--moku-text-secondary)] block">
                      of {formatCurrency(item.totalPlanned, currency)}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
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

                {/* Sector signal pills */}
                {item.sectors.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
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

      {/* Monthly Reflection Questions Form */}
      <AppCard padding="lg" className="space-y-4">
        <div className="flex items-center space-x-2">
          <Heart className="w-5 h-5 text-[var(--moku-primary)]" />
          <h2 className="text-base font-bold text-[var(--moku-text-primary)]">
            Reflect &amp; Improve (Kaizen)
          </h2>
        </div>

        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--moku-text-secondary)] uppercase tracking-wider mb-1">
              What went well with your money this month?
            </label>
            <textarea
              value={wentWellText}
              onChange={(e) => setWentWellText(e.target.value)}
              placeholder="e.g. Cooked dinners regularly, stuck to my groceries budget..."
              rows={2}
              className="w-full p-3 rounded-xl border border-[var(--moku-outline)] bg-[var(--moku-surface-secondary)] text-xs text-[var(--moku-text-primary)] outline-none resize-none focus:border-[var(--moku-primary)]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--moku-text-secondary)] uppercase tracking-wider mb-1">
              What will you adjust next month?
            </label>
            <textarea
              value={reflectionText}
              onChange={(e) => setReflectionText(e.target.value)}
              placeholder="e.g. Review subscriptions, set a strict cap on weekend takeout..."
              rows={3}
              className="w-full p-3 rounded-xl border border-[var(--moku-outline)] bg-[var(--moku-surface-secondary)] text-xs text-[var(--moku-text-primary)] outline-none resize-none focus:border-[var(--moku-primary)]"
            />
          </div>

          <div className="pt-1 flex items-center justify-between">
            {savedSuccess ? (
              <span className="text-xs font-bold text-[var(--moku-primary)] flex items-center space-x-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Reflection saved</span>
              </span>
            ) : (
              <span className="text-[11px] text-[var(--moku-text-secondary)]">
                Saved locally &amp; synced
              </span>
            )}

            <AppButton
              type="submit"
              size="md"
              icon={<Sparkles className="w-3.5 h-3.5" />}
            >
              Save Reflection
            </AppButton>
          </div>
        </form>
      </AppCard>
    </div>
  );
}
