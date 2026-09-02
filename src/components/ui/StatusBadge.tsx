import React from 'react';
import { BudgetSignal } from '../../types';

interface StatusBadgeProps {
  status: BudgetSignal;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'xs',
  className = '',
  showIcon = false,
}) => {
  let label = 'NOT STARTED';
  let badgeStyle = 'bg-[var(--moku-surface-secondary)] text-[var(--moku-text-secondary)] border-[var(--moku-outline)]';
  let dotColor = 'bg-[var(--moku-text-tertiary)]';

  switch (status) {
    case 'IN_PROGRESS':
    case 'ON_TRACK':
      label = 'ON TRACK';
      badgeStyle = 'bg-[var(--moku-primary-container)] text-[var(--moku-primary)] border-[var(--moku-primary)]/20';
      dotColor = 'bg-[var(--moku-primary)]';
      break;
    case 'WATCH':
      label = 'WATCH';
      badgeStyle = 'bg-[var(--moku-warning-container)] text-[var(--moku-warning-text)] border-[var(--moku-warning)]/30';
      dotColor = 'bg-[var(--moku-warning)]';
      break;
    case 'PAID':
      label = 'PAID';
      badgeStyle = 'bg-[var(--moku-success-container)] text-[var(--moku-success-text)] border-[var(--moku-success)]/30';
      dotColor = 'bg-[var(--moku-success)]';
      break;
    case 'UNDER_PLAN':
      label = 'UNDER PLAN';
      badgeStyle = 'bg-[var(--moku-success-container)] text-[var(--moku-success-text)] border-[var(--moku-success)]/30';
      dotColor = 'bg-[var(--moku-success)]';
      break;
    case 'OVER_PLAN':
      label = 'OVER PLAN';
      badgeStyle = 'bg-[var(--moku-danger-container)] text-[var(--moku-danger-text)] border-[var(--moku-danger)]/30';
      dotColor = 'bg-[var(--moku-danger)]';
      break;
    case 'UNPLANNED':
      label = 'UNPLANNED';
      badgeStyle = 'bg-[var(--moku-unplanned-container)] text-[var(--moku-unplanned-text)] border-[var(--moku-unplanned)]/30';
      dotColor = 'bg-[var(--moku-unplanned)]';
      break;
    case 'NOT_STARTED':
    default:
      label = 'NOT STARTED';
      badgeStyle = 'bg-[var(--moku-surface-secondary)] text-[var(--moku-text-secondary)] border-[var(--moku-outline)]';
      dotColor = 'bg-[var(--moku-text-tertiary)]';
      break;
  }

  const sizeClasses = {
    xs: 'px-2 py-0.5 text-[10px] font-bold',
    sm: 'px-2.5 py-1 text-xs font-bold',
    md: 'px-3 py-1.5 text-xs font-bold',
  }[size];

  return (
    <span
      className={`inline-flex items-center space-x-1.5 rounded-full border leading-none tracking-wider uppercase font-medium ${sizeClasses} ${badgeStyle} ${className}`}
    >
      {showIcon && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />}
      <span>{label}</span>
    </span>
  );
};
