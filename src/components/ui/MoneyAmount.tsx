import React from 'react';
import { formatCurrency } from '../../lib/storage';

interface MoneyAmountProps {
  amount: number;
  currency?: string;
  className?: string;
  isVariance?: boolean;
  showSign?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold';
  color?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'muted' | 'autoVariance';
}

export const MoneyAmount: React.FC<MoneyAmountProps> = ({
  amount,
  currency = 'INR',
  className = '',
  isVariance = false,
  showSign = false,
  size = 'md',
  weight = 'bold',
  color = 'default',
}) => {
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg',
    '2xl': 'text-2xl',
    '3xl': 'text-3xl sm:text-4xl',
  }[size];

  const weightClasses = {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
    extrabold: 'font-extrabold',
  }[weight];

  let colorClass = 'text-[var(--moku-text-primary)]';

  if (color === 'primary') {
    colorClass = 'text-[var(--moku-primary)]';
  } else if (color === 'success') {
    colorClass = 'text-[var(--moku-success)]';
  } else if (color === 'warning') {
    colorClass = 'text-[var(--moku-warning)]';
  } else if (color === 'danger') {
    colorClass = 'text-[var(--moku-danger)]';
  } else if (color === 'muted') {
    colorClass = 'text-[var(--moku-text-secondary)]';
  } else if (color === 'autoVariance' || isVariance) {
    if (amount > 0) {
      colorClass = 'text-[var(--moku-danger)]';
    } else if (amount < 0) {
      colorClass = 'text-[var(--moku-success)]';
    } else {
      colorClass = 'text-[var(--moku-text-secondary)]';
    }
  }

  const formatted = formatCurrency(Math.abs(amount), currency);
  let prefix = '';
  if (showSign || isVariance) {
    if (amount > 0) prefix = '+';
    else if (amount < 0) prefix = '-';
  }

  return (
    <span className={`font-tabular tracking-tight inline-flex items-baseline ${sizeClasses} ${weightClasses} ${colorClass} ${className}`}>
      {prefix}{formatted}
    </span>
  );
};
