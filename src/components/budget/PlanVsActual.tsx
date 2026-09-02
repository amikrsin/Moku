import React from 'react';
import { Plan, Expense } from '../../types';
import { formatCurrency } from '../../lib/storage';
import { MoneyAmount } from '../ui/MoneyAmount';
import { AppCard } from '../ui/AppCard';

interface PlanVsActualProps {
  plan: Plan | null;
  expenses: Expense[];
  monthKey: string;
  currency: string;
  onOpenPlanWizard?: () => void;
}

export const PlanVsActual: React.FC<PlanVsActualProps> = ({
  plan,
  expenses,
  monthKey,
  currency,
  onOpenPlanWizard,
}) => {
  const activeExpenses = expenses.filter((e) => e.monthKey === monthKey && !e.deleted);
  const totalSpent = activeExpenses.reduce((sum, e) => sum + e.amount, 0);

  const income = plan?.income || 0;
  const savingsTarget = plan?.savingsTarget || 0;
  const spendableBudget = Math.max(0, income - savingsTarget);
  const variance = totalSpent - spendableBudget;
  const remainingSpendable = Math.max(0, spendableBudget - totalSpent);
  const isOverSpendable = totalSpent > spendableBudget && spendableBudget > 0;

  return (
    <AppCard padding="md" className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--moku-text-secondary)] block">
            Plan vs Actual
          </span>
          <h2 className="text-lg font-bold text-[var(--moku-text-primary)]">
            Monthly Spendable Pool
          </h2>
        </div>
        {onOpenPlanWizard && (
          <button
            type="button"
            onClick={onOpenPlanWizard}
            className="text-xs font-semibold text-[var(--moku-primary)] hover:underline cursor-pointer"
          >
            {plan ? 'Adjust Plan' : 'Create Plan'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* 1. Inflow Pool */}
        <div className="p-3 rounded-2xl bg-[var(--moku-surface-secondary)] border border-[var(--moku-outline-variant)]">
          <span className="text-[10px] font-medium text-[var(--moku-text-secondary)] uppercase tracking-wider block">
            Available
          </span>
          <MoneyAmount
            amount={income}
            currency={currency}
            size="lg"
            weight="extrabold"
            className="mt-0.5"
          />
          <span className="text-[10px] text-[var(--moku-text-secondary)] block">
            Inflow budget
          </span>
        </div>

        {/* 2. Committed Savings */}
        <div className="p-3 rounded-2xl bg-[var(--moku-primary-container)] border border-[var(--moku-primary)]/20">
          <span className="text-[10px] font-medium text-[var(--moku-primary)] uppercase tracking-wider block">
            Savings
          </span>
          <MoneyAmount
            amount={savingsTarget}
            currency={currency}
            size="lg"
            weight="extrabold"
            color="primary"
            className="mt-0.5"
          />
          <span className="text-[10px] text-[var(--moku-primary)]/80 block">
            Paid to self
          </span>
        </div>

        {/* 3. Spendable Budget */}
        <div className="p-3 rounded-2xl bg-[var(--moku-surface-secondary)] border border-[var(--moku-outline-variant)]">
          <span className="text-[10px] font-medium text-[var(--moku-text-secondary)] uppercase tracking-wider block">
            Plan Pool
          </span>
          <MoneyAmount
            amount={spendableBudget}
            currency={currency}
            size="lg"
            weight="extrabold"
            className="mt-0.5"
          />
          <span className="text-[10px] text-[var(--moku-text-secondary)] block">
            Max spending
          </span>
        </div>

        {/* 4. Actual Spent */}
        <div className="p-3 rounded-2xl bg-[var(--moku-surface-secondary)] border border-[var(--moku-outline-variant)]">
          <span className="text-[10px] font-medium text-[var(--moku-text-secondary)] uppercase tracking-wider block">
            Total Spent
          </span>
          <MoneyAmount
            amount={totalSpent}
            currency={currency}
            size="lg"
            weight="extrabold"
            color={isOverSpendable ? 'danger' : 'default'}
            className="mt-0.5"
          />
          <span className="text-[10px] text-[var(--moku-text-secondary)] block">
            {isOverSpendable ? (
              <span className="text-[var(--moku-danger)] font-semibold">
                +{formatCurrency(variance, currency)} over
              </span>
            ) : (
              `${formatCurrency(remainingSpendable, currency)} left`
            )}
          </span>
        </div>
      </div>
    </AppCard>
  );
};
