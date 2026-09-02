import React from 'react';
import { BudgetSignal } from '../../types';

interface BudgetProgressProps {
  spent: number;
  total: number;
  status?: BudgetSignal;
  height?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const BudgetProgress: React.FC<BudgetProgressProps> = ({
  spent,
  total,
  status,
  height = 'md',
  className = '',
}) => {
  const percentage = total > 0 ? Math.min(100, Math.round((spent / total) * 100)) : 0;
  const isOver = spent > total && total > 0;

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-2.5',
  }[height];

  let barColor = 'bg-[var(--moku-primary)]';
  if (isOver || status === 'OVER_PLAN') {
    barColor = 'bg-[var(--moku-danger)]';
  } else if (status === 'WATCH' || percentage >= 80) {
    barColor = 'bg-[var(--moku-warning)]';
  } else if (status === 'UNPLANNED') {
    barColor = 'bg-[var(--moku-unplanned)]';
  } else if (status === 'PAID') {
    barColor = 'bg-[var(--moku-success)]';
  }

  return (
    <div
      role="progressbar"
      aria-valuenow={percentage}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`w-full bg-[var(--moku-surface-secondary)] rounded-full overflow-hidden ${heightClasses} ${className}`}
    >
      <div
        className={`${heightClasses} rounded-full transition-all duration-300 ${barColor}`}
        style={{ width: `${isOver ? 100 : Math.max(percentage > 0 ? 3 : 0, percentage)}%` }}
      />
    </div>
  );
};
