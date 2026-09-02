import React, { useState, useEffect } from 'react';
import { Sparkles, Check, ArrowRight, BookOpen, Heart, TrendingUp, AlertTriangle, CheckCircle2, DollarSign, PieChart } from 'lucide-react';
import { Category, CATEGORIES, Expense, Plan, BudgetSignal } from '../types';
import { formatCurrency, formatMonthName, computeCategorySectorBreakdown } from '../lib/storage';

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

  const income = plan?.income || 50000;
  const savingsTarget = plan?.savingsTarget || 10000;
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
      {/* Top Header */}
      <div className="pt-1">
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#6E736F] dark:text-[#C1C7C0]">
          {formatMonthName(monthKey)} · Reflection & Review
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1C1A] dark:text-[#E3E5E1] mt-0.5">
          Conscious Monthly Review
        </h1>
      </div>

      {/* 4 Core Kakeibo Review Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Q1: Available Pool */}
        <div className="p-4 rounded-[22px] bg-white dark:bg-[#1B1E1B] border border-[#DDE2DD] dark:border-[#414842] shadow-xs">
          <span className="text-[11px] font-semibold text-[#6E736F] dark:text-[#C1C7C0] block">
            1. Available Money
          </span>
          <strong className="text-lg font-bold font-tabular text-[#1A1C1A] dark:text-[#E3E5E1] block mt-1">
            {formatCurrency(income, currency)}
          </strong>
          <span className="text-[10px] text-[#6E736F] dark:text-[#C1C7C0]">
            Inflows & carryover
          </span>
        </div>

        {/* Q2: Target Savings */}
        <div className="p-4 rounded-[22px] bg-[#D8F3E7] dark:bg-[#214C3D] border border-[#176B52]/15 dark:border-[#82D9B4]/20 shadow-xs">
          <span className="text-[11px] font-semibold text-[#176B52] dark:text-[#82D9B4] block">
            2. Committed Savings
          </span>
          <strong className="text-lg font-bold font-tabular text-[#176B52] dark:text-[#82D9B4] block mt-1">
            {formatCurrency(savingsTarget, currency)}
          </strong>
          <span className="text-[10px] text-[#176B52]/80 dark:text-[#82D9B4]/80">
            Paid to self first
          </span>
        </div>

        {/* Q3: Spendable Budget */}
        <div className="p-4 rounded-[22px] bg-white dark:bg-[#1B1E1B] border border-[#DDE2DD] dark:border-[#414842] shadow-xs">
          <span className="text-[11px] font-semibold text-[#6E736F] dark:text-[#C1C7C0] block">
            3. Spendable Plan
          </span>
          <strong className="text-lg font-bold font-tabular text-[#1A1C1A] dark:text-[#E3E5E1] block mt-1">
            {formatCurrency(spendableBudget, currency)}
          </strong>
          <span className="text-[10px] text-[#6E736F] dark:text-[#C1C7C0]">
            Budgeted expense pool
          </span>
        </div>

        {/* Actual Spent & Variance */}
        <div className="p-4 rounded-[22px] bg-white dark:bg-[#1B1E1B] border border-[#DDE2DD] dark:border-[#414842] shadow-xs">
          <span className="text-[11px] font-semibold text-[#6E736F] dark:text-[#C1C7C0] block">
            Actual Spent
          </span>
          <strong className={`text-lg font-bold font-tabular block mt-1 ${totalVariance >= 0 ? 'text-[#176B52] dark:text-[#82D9B4]' : 'text-rose-600'}`}>
            {formatCurrency(totalSpent, currency)}
          </strong>
          <span className="text-[10px] text-[#6E736F] dark:text-[#C1C7C0]">
            {totalVariance >= 0 ? `+${formatCurrency(totalVariance, currency)} under plan` : `${formatCurrency(Math.abs(totalVariance), currency)} over plan`}
          </span>
        </div>
      </div>

      {/* Plan vs Actual Variance Across Categories */}
      <div className="bg-white dark:bg-[#1B1E1B] border border-[#DDE2DD] dark:border-[#414842] rounded-[24px] p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#1A1C1A] dark:text-[#E3E5E1]">
            Plan vs. Actual Variance
          </h2>
          <span className="text-xs text-[#6E736F] dark:text-[#C1C7C0]">4 Kakeibo Pillars</span>
        </div>

        <div className="space-y-3">
          {categoryBreakdowns.map((catData) => {
            const catInfo = CATEGORIES[catData.catKey];
            const variance = catData.totalActual - catData.totalPlanned;
            return (
              <div 
                key={catData.catKey}
                className="p-3.5 rounded-2xl bg-[#F7F8F7] dark:bg-[#252925] border border-[#DDE2DD] dark:border-[#414842] space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{catInfo.icon}</span>
                    <span className="text-xs font-bold text-[#1A1C1A] dark:text-[#E3E5E1]">
                      {catInfo.name}
                    </span>
                    {renderSignalBadge(catData.overallStatus)}
                  </div>
                  <div className="text-right">
                    <strong className="text-xs font-bold font-tabular text-[#1A1C1A] dark:text-[#E3E5E1]">
                      {formatCurrency(catData.totalActual, currency)}
                    </strong>
                    <span className="text-[10px] text-[#6E736F] dark:text-[#C1C7C0] block">
                      Plan: {formatCurrency(catData.totalPlanned, currency)}
                    </span>
                  </div>
                </div>

                {/* Sub-sectors summary */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {catData.sectors.map(sec => (
                    <span 
                      key={sec.id}
                      className="px-2 py-0.5 rounded-lg bg-white dark:bg-[#1B1E1B] border border-[#DDE2DD] dark:border-[#414842] text-[10px] font-medium text-[#1A1C1A] dark:text-[#E3E5E1] flex items-center space-x-1"
                    >
                      <span>{sec.name}:</span>
                      <strong className="font-tabular">{formatCurrency(sec.actualAmount, currency)}</strong>
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mindful Habit Goal from Plan */}
      {plan?.improvementNotes && (
        <div className="p-4 rounded-[22px] bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Target Habit For {formatMonthName(monthKey)}</span>
          </div>
          <p className="text-xs text-[#1A1C1A] dark:text-[#E3E5E1] italic">
            &ldquo;{plan.improvementNotes}&rdquo;
          </p>
        </div>
      )}

      {/* Reflection Journaling Questions */}
      <form onSubmit={handleSave} className="space-y-4">
        <div className="bg-white dark:bg-[#1B1E1B] border border-[#DDE2DD] dark:border-[#414842] rounded-[24px] p-5 shadow-xs space-y-2">
          <label className="flex items-center space-x-2 text-sm font-bold text-[#1A1C1A] dark:text-[#E3E5E1]">
            <Heart className="w-4 h-4 text-[#176B52] dark:text-[#82D9B4]" />
            <span>What went well this month?</span>
          </label>
          <textarea
            value={wentWellText}
            onChange={(e) => setWentWellText(e.target.value)}
            placeholder="e.g. Stayed within grocery budget, cooked at home on weeknights, paid savings first on day 1..."
            className="w-full h-24 p-3.5 text-xs rounded-xl border border-[#DDE2DD] dark:border-[#414842] bg-[#F7F8F7] dark:bg-[#252925] text-[#1A1C1A] dark:text-[#E3E5E1] outline-none focus:border-[#176B52] resize-none"
          />
        </div>

        <div className="bg-white dark:bg-[#1B1E1B] border border-[#DDE2DD] dark:border-[#414842] rounded-[24px] p-5 shadow-xs space-y-2">
          <label className="flex items-center space-x-2 text-sm font-bold text-[#1A1C1A] dark:text-[#E3E5E1]">
            <BookOpen className="w-4 h-4 text-[#B5652E]" />
            <span>Question 4: What will you improve next month?</span>
          </label>
          <textarea
            value={reflectionText}
            onChange={(e) => setReflectionText(e.target.value)}
            placeholder="e.g. Reduce impulse weekend takeaways, review unused recurring subscriptions, and walk for shorter distances..."
            className="w-full h-24 p-3.5 text-xs rounded-xl border border-[#DDE2DD] dark:border-[#414842] bg-[#F7F8F7] dark:bg-[#252925] text-[#1A1C1A] dark:text-[#E3E5E1] outline-none focus:border-[#176B52] resize-none"
          />
        </div>

        {/* Save button */}
        <button
          id="save-reflection-btn"
          type="submit"
          className="w-full h-13 rounded-2xl bg-[#176B52] hover:bg-[#125843] dark:bg-[#82D9B4] dark:hover:bg-[#6ec29e] text-white dark:text-[#121412] font-bold text-sm shadow-md active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center space-x-2"
        >
          {savedSuccess ? (
            <>
              <Check className="w-5 h-5 text-white dark:text-[#121412]" />
              <span>Reflection Saved</span>
            </>
          ) : (
            <>
              <span>Save Monthly Reflection</span>
              <ArrowRight className="w-4 h-4 text-white dark:text-[#121412]" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
